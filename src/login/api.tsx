import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:10000/api",
  withCredentials: true,  // MUST BE HERE ONLY
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;

