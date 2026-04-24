import Show from "../models/Show.js";
import Movie from "../models/Movie.js";
import Booking from "../models/Booking.js";

// Add Show : /api/show/add
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput } = req.body;
    const movie = await Movie.findById(movieId);
    if (!movie) return res.json({ success: false, message: "Movie not found" });

    const showsToInsert = [];
    for (const dateEntry of showsInput) {
      const { date, times } = dateEntry;
      for (const timeEntry of times) {
        const { time, showPrice, totalSeats } = timeEntry;
        showsToInsert.push({
          movie: movieId,
          date,
          time,
          showPrice,
          totalSeats: totalSeats || 40,
          occupiedSeats: {},
        });
      }
    }

    await Show.insertMany(showsToInsert);
    res.json({ success: true, message: "Shows added successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Get Shows : /api/show/all
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({}).populate("movie");

  
    const validShows = shows.filter((show) => show.movie !== null);

    const movieMap = {};

    for (const show of validShows) {
      try {
        const movieId = show.movie._id.toString();

        if (!movieMap[movieId]) {
          movieMap[movieId] = {
            movie: show.movie,
            dateTime: {},
          };
        }

        const dateKey = show.date;
        if (!movieMap[movieId].dateTime[dateKey]) {
          movieMap[movieId].dateTime[dateKey] = [];
        }

        movieMap[movieId].dateTime[dateKey].push({
          time: show.time,
          showId: show._id,
          showPrice: show.showPrice, 
        });
      } catch (err) {
        
        console.warn("Skipping show due to error:", err.message);
      }
    }

    const formattedShows = Object.values(movieMap);
    res.json({ success: true, shows: formattedShows });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Get Show : /api/show/:id
export const getShow = async (req, res) => {
  try {
    const { id } = req.params;
    const shows = await Show.find({ movie: id }).populate("movie");

    if (!shows || shows.length === 0) {
      return res.json({ success: false, message: "Show not found" });
    }

    const movie = shows[0].movie;
    const dateTime = {};
    let showPrice = 0;

    for (const show of shows) {
      const dateKey = show.date;
      if (!dateTime[dateKey]) {
        dateTime[dateKey] = [];
      }
      dateTime[dateKey].push({
        time: show.time,
        showId: show._id,
        showPrice: show.showPrice,
      });
      if (!showPrice) showPrice = show.showPrice;
    }

    res.json({
      success: true,
      movie,
      dateTime,
      showPrice,
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Get Occupied Seats : /api/show/seats/:showId
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const show = await Show.findById(showId);
    if (!show) return res.json({ success: false, message: "Show not found" });

    res.json({ success: true, occupiedSeats: show.occupiedSeats });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Get Now Playing Movies : /api/show/now-playing
export const getNowPlayingMovies = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const shows = await Show.find({ date: { $gte: today } }).populate("movie");

    const validShows = shows.filter((show) => show.movie !== null);

    const movieMap = {};
    for (const show of validShows) {
      try {
        const movieId = show.movie._id.toString();
        if (!movieMap[movieId]) {
          movieMap[movieId] = show.movie;
        }
      } catch (err) {
        console.warn("Skipping show:", err.message);
      }
    }

    const movies = Object.values(movieMap);
    res.json({ success: true, movies });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Delete Show : /api/show/delete/:id
export const deleteShow = async (req, res) => {
  try {
    const { id } = req.params;
    await Show.findByIdAndDelete(id);
    res.json({ success: true, message: "Show deleted successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};