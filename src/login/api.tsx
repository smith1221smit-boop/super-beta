import axios from "axios";

const api = axios.create({
  baseURL: "	https://super-back-507l.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

