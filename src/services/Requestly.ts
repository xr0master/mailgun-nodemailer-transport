import { request as requestHttp, RequestOptions as HttpRequestOptions } from 'http';
import { request as requestHttps, RequestOptions as HttpsRequestOptions } from 'https';
import FormData from 'form-data';

import type { IncomingMessage } from 'http';


function sendRequest(
  options: HttpRequestOptions | HttpsRequestOptions,
  formData: FormData,
  isHttpProxy=false,
  ): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = (isHttpProxy ? requestHttp : requestHttps)(options);

    formData.pipe(req);

    req.on('response', (res: IncomingMessage) => {
      const chunks = [] as Uint8Array[];

      res.on('data', (chunk: Uint8Array) => chunks.push(chunk));

      res.on('end', () => {
        const data = Buffer.concat(chunks).toString();

        if (res.statusCode === 202 || res.statusCode === 200) {
          resolve(data);
        } else {
          reject(data);
        }
      });

      res.on('error', (error) => {
        reject(error);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

export function postForm(
  options: HttpRequestOptions | HttpsRequestOptions,
  formData: FormData,
  isHttpProxy=false,
  ): Promise<string> {
  options.method = 'POST';
  options.headers = formData.getHeaders();

  return sendRequest(options, formData, isHttpProxy);
}
