import axios from "axios";

const api = axios.create({
  baseURL: "https://super-beta-back-1-cue8.onrender.comapi",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

