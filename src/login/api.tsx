import axios from "axios";

const api = axios.create({
  baseURL: "https://socket-back-2u2k.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

