import axios from "axios";

const api = axios.create({
  baseURL: "https://ramus-back-1-97k5.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

