import serverless from 'serverless-http';
import express from 'express';
import { app } from '../../server/src/app.js';
import { initializeDatabase } from '../../server/src/db.js';

const functionApp = express();
functionApp.use((request, _response, next) => {
  const functionPrefix = '/.netlify/functions/api';
  const requestUrl = new URL(request.url, 'http://localhost');
  if (requestUrl.pathname === functionPrefix || requestUrl.pathname.startsWith(`${functionPrefix}/`)) {
    requestUrl.pathname = `/api${requestUrl.pathname.slice(functionPrefix.length)}`;
  } else if (requestUrl.pathname !== '/api' && !requestUrl.pathname.startsWith('/api/')) {
    requestUrl.pathname = `/api${requestUrl.pathname}`;
  }
  request.url = `${requestUrl.pathname}${requestUrl.search}`;
  next();
});
functionApp.use(app);

const handleRequest = serverless(functionApp);

export const handler: typeof handleRequest = async (event, context) => {
  await initializeDatabase();
  return handleRequest(event, context);
};
