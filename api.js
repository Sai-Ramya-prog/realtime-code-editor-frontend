import axios from 'axios';

const API = axios.create({
  baseURL: 'https://realtime-code-editor-backend-l2ok.onrender.com/api/projects',
});

// Save project
export const saveProject = async (payload) => {
  return await API.post('/save', payload);
};

// Load project
export const loadProject = async (roomId) => {
  return await API.get(`/load/${roomId}`);
};
