import axios from "axios";

const api = axios.create({
  baseURL: "https://user2-back.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

