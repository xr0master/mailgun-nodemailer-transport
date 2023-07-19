/// <reference types="node" />
import { Agent as httpAgent } from 'http';
import { Agent as httpsAgent } from 'https';
import type { SentMessageInfo, Transport } from 'nodemailer';
import type MailMessage from 'nodemailer/lib/mailer/mail-message';
interface Proxy {
    protocol: string;
    host: string;
    port: number;
}
export interface Options {
    hostname?: string;
    proxy?: Proxy;
    agent?: httpAgent | httpsAgent;
    auth: {
        domain: string;
        apiKey: string;
    };
}
export declare class MailgunTransport implements Transport {
    private readonly requestConfig;
    private cids;
    private isHttp;
    name: string;
    version: string;
    constructor(options: Options);
    private findEmbeddedAttachments;
    private appendAddresses;
    private appendContent;
    private appendImages;
    private appendAttachments;
    private submitForm;
    send(mail: MailMessage, done: (err: Error | null, info?: SentMessageInfo) => void): void;
}
export default MailgunTransport;
