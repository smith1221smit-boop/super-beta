import axios from "axios";

const api = axios.create({
  baseURL: "https://mihosh-back-1.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

