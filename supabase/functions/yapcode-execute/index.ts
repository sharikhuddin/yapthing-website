import {makeHandler} from './handler.mjs';
Deno.serve(makeHandler(key=>Deno.env.get(key)));
