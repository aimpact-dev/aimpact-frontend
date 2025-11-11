import { httpRouter } from 'convex/server';
import { paidContentHandler } from './handlers';

const http = httpRouter();

http.route({
  path: '/paid-content',
  method: 'GET',
  handler: paidContentHandler,
});

export default http;
