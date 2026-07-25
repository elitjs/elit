declare module 'selfsigned' {
    export interface GenerateOptions {
        keySize?: number;
        days?: number;
        algorithm?: string;
        [option: string]: unknown;
    }

    export interface Pems {
        private: string;
        public: string;
        cert: string;
        fingerprint: string;
    }

    export function generate(
        attrs: Array<{ name: string; value: string }> | null,
        options?: GenerateOptions,
    ): Pems;
}
