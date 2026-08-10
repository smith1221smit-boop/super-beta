import axios from "axios";

const api = axios.create({
  baseURL: "https://beta-back0100-181e.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

