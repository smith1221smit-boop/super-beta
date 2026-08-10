import axios from "axios";

const api = axios.create({
  baseURL: "https://ramus-back-1-t9i9.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

