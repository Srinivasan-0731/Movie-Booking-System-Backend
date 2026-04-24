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

//  Get now playing movies
export const getNowPlayingMovies = async (req, res) => {
  try {
    const data = await tmdbGet("https://api.themoviedb.org/3/movie/now_playing");
    res.json({ success: true, movies: data.results });
  } catch (error) {
    console.error("getNowPlayingMovies error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    const showToCreate = showsInput.map((show) => ({
      movie: movieId,
      showDateTime: new Date(`${show.date}T${show.time}:00`),
      showPrice,
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

//  Get all upcoming shows
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate("movie")
      .sort({ showDateTime: 1 });

    const map = new Map();
    shows.forEach((show) => {
      
      if (!show.movie) return;
      const id = show.movie._id.toString();
      if (!map.has(id)) {
        map.set(id, show.movie);
      }
    });

    res.json({ success: true, shows: Array.from(map.values()) });
  } catch (error) {
    console.error("getShows error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get single movie shows
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

    const dateTime = {};
    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) {
        dateTime[date] = [];
      }
      dateTime[date].push({
        time: show.showDateTime,
        showId: show._id,
        showPrice: show.showPrice,
      });
    });

    
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