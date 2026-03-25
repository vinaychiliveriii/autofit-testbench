import toast from 'react-hot-toast';

export const apiRequest = async (endpoint, method = "GET", body = null, hideToast = false) => {
  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": 'eyJhbGciOiJIUzUxMiJ9.eyJyb2xlIjoiUk9MRV9ERVNJR05FUiIsInByb2plY3QiOiI0NjFkZTg1Yy05NTE5LTQ4N2UtOGQ4ZS03NzY1MzRlYjY4YTUiLCJlbWFpbCI6ImFraGlsZXNoLnNAaG9tZWxhbmUuY29tIiwib3BlbiI6ZmFsc2UsInN1YiI6ImFraGlsZXNoLnNAaG9tZWxhbmUuY29tIiwiaWF0IjoxNzc0NDA3MjYwLCJleHAiOjE4MDU5NDMyNjB9.ij-9dQdIfNFcY8DUI54iRpgy0EPEU63YUb3rV5roba_viZfOMUff-b1oE1vYbQfWJo64-m-2IL1m3JS-wDdFuQ',
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