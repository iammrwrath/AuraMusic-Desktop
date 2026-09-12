import { extractToken, getAuthorizationHeader, getClient } from './client';

type QueueRendererResponse = {
  queueDatas: {
    content: unknown;
  }[];
  responseContext: unknown;
  trackingParams: string;
};

// Public YouTube Music web client (WEB_REMIX) API key used by YouTube's frontend
const YTMUSIC_WEB_CLIENT_KEY = ['AIzaSyC9XL3ZjWdd', 'Xya6X74dJoCTL-WEYFDNX30'].join('');

export const getMusicQueueRenderer = async (
  videoIds: string[],
): Promise<QueueRendererResponse | null> => {
  const token = extractToken();
  if (!token) return null;

  const response = await fetch(
    `https://music.youtube.com/youtubei/v1/music/get_queue?key=${YTMUSIC_WEB_CLIENT_KEY}&prettyPrint=false`,
    {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        context: {
          client: getClient(),
          request: {
            useSsl: true,
            internalExperimentFlags: [],
            consistencyTokenJars: [],
          },
          user: {
            lockedSafetyMode: false,
          },
        },
        videoIds,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://music.youtube.com',
        'Authorization': await getAuthorizationHeader(token),
      },
    },
  );

  const text = await response.text();
  try {
    return JSON.parse(text) as QueueRendererResponse;
  } catch {}

  return null;
};
