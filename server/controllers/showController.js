import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";


const tmdbGet = async (url, retries = 3, delayMs = 500) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
        timeout: 1000,
      });
      return data;
    } catch (error) {
      const isRetryable =
        error.code === "ECONNRESET" ||
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        error.response?.status >= 500;

      if (isRetryable && attempt < retries) {
        console.warn(`TMDB request failed (attempt ${attempt}/${retries}), retrying in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs * attempt));
        continue;
      }

      throw error;
    }
  }
};

// Timezone-safe date key (IST / local time, not UTC)
const getLocalDateKey = (dateObj) => {
  
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + IST_OFFSET);
  return istDate.toISOString().split("T")[0];
};

// Get now playing movies
export const getNowPlayingMovies = async (req, res) => {
  try {
    const data = await tmdbGet("https://api.themoviedb.org/3/movie/now_playing");
    res.json({ success: true, movies: data.results });
  } catch (error) {
    console.error("getNowPlayingMovies error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add Show : /api/show/add
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    if (!movieId || !showsInput?.length || !showPrice) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
      });
    }

    let movie = await Movie.findById(movieId);

    if (!movie) {
      const [m, c] = await Promise.all([
        tmdbGet(`https://api.themoviedb.org/3/movie/${movieId}`),
        tmdbGet(`https://api.themoviedb.org/3/movie/${movieId}/credits`),
      ]);

      movie = await Movie.create({
        _id: movieId,
        title: m.title,
        overview: m.overview,
        poster_path: m.poster_path,
        backdrop_path: m.backdrop_path,
        release_date: m.release_date,
        original_language: m.original_language,
        tagline: m.tagline || "",
        genres: m.genres,
        casts: c.cast,
        vote_average: m.vote_average,
        runtime: m.runtime,
      });
    }

    // screen field support
    const showToCreate = showsInput.map((show) => ({
      movie: movieId,
      showDateTime: new Date(`${show.date}T${show.time}:00`),
      showPrice,
      screen: show.screen || "Screen 1",
      occupiedSeats: {},
    }));

    if (showToCreate.length > 0) {
      await Show.insertMany(showToCreate);
    }

    await inngest.send({
      name: "app/show.added",
      data: { movieTitle: movie.title },
    });

    res.json({ success: true, message: "Show added successfully" });
  } catch (error) {
    console.error("addShow error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all upcoming shows : /api/show/all
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate("movie")
      .sort({ showDateTime: 1 });

    const validShows = shows.filter((show) => show.movie !== null);

    if (validShows.length === 0) {
      const movies = await Movie.find({});
      const formattedShows = movies.map((movie) => ({
        movie,
        dateTime: {},
      }));
      return res.json({ success: true, shows: formattedShows });
    }

    const movieMap = new Map();

    validShows.forEach((show) => {
      const id = show.movie._id.toString();

      if (!movieMap.has(id)) {
        movieMap.set(id, {
          movie: show.movie,
          dateTime: {},
        });
      }

      const entry = movieMap.get(id);
      //  Use IST date key instead of UTC
      const dateKey = getLocalDateKey(show.showDateTime);
      const screen = show.screen || "Screen 1";

      if (!entry.dateTime[dateKey]) {
        entry.dateTime[dateKey] = {};
      }

      if (!entry.dateTime[dateKey][screen]) {
        entry.dateTime[dateKey][screen] = [];
      }

      entry.dateTime[dateKey][screen].push({
        time: show.showDateTime,
        showId: show._id,
        showPrice: show.showPrice,
        screen,
      });
    });

    res.json({ success: true, shows: Array.from(movieMap.values()) });
  } catch (error) {
    console.error("getShows error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single movie shows : /api/show/:movieId
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    const parsedMovieId = Number(movieId);
    if (isNaN(parsedMovieId)) {
      return res.status(400).json({ success: false, message: "Invalid movie ID" });
    }

    const [shows, movie] = await Promise.all([
      Show.find({
        movie: parsedMovieId,
        showDateTime: { $gte: new Date() },
      }),
      Movie.findById(parsedMovieId),
    ]);

    if (!movie) {
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    // Group by IST date → screen → times
    const dateTime = {};
    shows.forEach((show) => {
      const date = getLocalDateKey(show.showDateTime); 
      const screen = show.screen || "Screen 1";

      if (!dateTime[date]) {
        dateTime[date] = {};
      }
      if (!dateTime[date][screen]) {
        dateTime[date][screen] = [];
      }

      dateTime[date][screen].push({
        time: show.showDateTime,
        showId: show._id,
        showPrice: show.showPrice,
        screen,
      });
    });

    // Trailer fetch
    let trailerKey = null;
    try {
      const videosData = await tmdbGet(
        `https://api.themoviedb.org/3/movie/${parsedMovieId}/videos`
      );
      const trailer = videosData.results.find(
        (v) => v.type === "Trailer" && v.site === "YouTube"
      );
      trailerKey = trailer ? trailer.key : null;
    } catch (videoError) {
      console.warn("Trailer fetch failed:", videoError.message);
    }

    const cast = (movie.casts || []).slice(0, 10).map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      profile_path: member.profile_path || null,
    }));

    const firstShow = shows[0];
    const showPrice = firstShow ? firstShow.showPrice : 0;

    res.json({
      success: true,
      movie,
      dateTime,
      trailerKey,
      cast,
      showPrice,
    });
  } catch (error) {
    console.error("getShow error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};