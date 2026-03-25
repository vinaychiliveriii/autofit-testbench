import toast from 'react-hot-toast';

export const apiRequest = async (endpoint, method = "GET", body = null, hideToast = false) => {
  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": 'eyJhbGciOiJIUzUxMiJ9.eyJyb2xlIjoiUk9MRV9ERVNJR05FUiIsInByb2plY3QiOiI5MTUxNGI0YS01OTEyLTQ0NWYtOGY4ZS0zZGYwMTI4MzdkZTEiLCJlbWFpbCI6ImFraGlsZXNoLnNAaG9tZWxhbmUuY29tIiwib3BlbiI6ZmFsc2UsInN1YiI6ImFraGlsZXNoLnNAaG9tZWxhbmUuY29tIiwiaWF0IjoxNzc0MzUwNTUxLCJleHAiOjE3NzQ0MzY5NTF9.6uaumozcmcVQBn8896Y222X2sRiX1rouUbA69sH_WOoeFQaU2cxxJUDw7Dwag0TfyOSf27BL4E1j5DJmSDG9vw',
    //   endpoint?.includes('rosters') ? `Bearer ${localStorage.getItem('roster_project_token')}`  || '' : localStorage.getItem('sc_project_token') || '',
      "source": "Spacecraft",
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${endpoint}`, config);

    if (response.status === 401) {
      if (!hideToast) toast.error('Unauthorized: Please relaunch the Lookbook from Spacecraft');
      throw new Error('Unauthorized (401)');
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
  
    console.error("API request failed:", error);
    throw error;
  }
};