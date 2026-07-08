export interface TestOptions {
    files?: string[];
    include?: string[];
    exclude?: string[];
    reporter?: 'default' | 'dot' | 'json' | 'verbose';
    timeout?: number;
    bail?: boolean;
    run?: boolean;
    watch?: boolean;
    endToEnd?: boolean;
    colors?: boolean;
    globals?: boolean;
    describePattern?: string;
    testPattern?: string;
    coverage?: {
        enabled: boolean;
        provider: 'v8' | 'istanbul';
        reporter?: ('text' | 'html' | 'lcov' | 'json' | 'coverage-final.json' | 'clover')[];
        include?: string[];
        exclude?: string[];
    };
}