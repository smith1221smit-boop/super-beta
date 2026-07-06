import axios from "axios";

const api = axios.create({
  baseURL: "https://super-back-fq5a.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

