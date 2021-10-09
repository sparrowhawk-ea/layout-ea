declare class LayoutEa {
    static readonly CLASS_PREFIX = "layout-ea--";
    static readonly CONTAINER_PREFIX = "layout-ea-";
    static layout(e: HTMLElement, config: Readonly<LayoutEaConfig>): HTMLStyleElement;
}
interface LayoutEaCallback {
    eaChild(e: HTMLElement, mediaName: string, selector: string, style: string, context?: unknown): string;
    eaParent(e: HTMLElement, mediaName: string, selector: string, style: string, context?: unknown): string;
}
interface LayoutEaConfig {
    readonly callback?: LayoutEaCallback;
    readonly dataPrefix?: string;
    readonly debug?: boolean;
    readonly ignore?: string[];
    readonly layout?: Record<string, string>;
    readonly mediaLayouts?: LayoutEaMediaLayout[];
    readonly sizes?: Record<string, string>;
    readonly strategy: LayoutEaStrategy;
}
declare const LayoutEaGrid: LayoutEaStrategy;
interface LayoutEaMediaLayout {
    fallback?: string;
    layout: Record<string, string>;
    mediaQuery: string;
    name?: string;
}
interface LayoutEaStrategy {
    readonly containerClassSuffix: string;
    layout(parent: Child, layout: string, sizes: Record<string, string>, callback: CallbackWrapper): void;
}
declare class CallbackWrapper {
    private readonly callback?;
    mediaName: string;
    cssRules: string[];
    constructor(callback?: LayoutEaCallback | undefined);
    child({ e, cssSelector }: Child, style: string, context?: unknown): void;
    parent({ e, cssSelector }: Child, style: string, context?: unknown): void;
}
declare class Child {
    readonly e: HTMLElement;
    private static classCounter;
    readonly children: Record<string, Child>;
    readonly cssSelector: string;
    private readonly childMatches;
    private readonly path;
    constructor(e: HTMLElement, name: string, parent?: Child);
    die(error: string, context?: string): void;
    getChildRefs(templates: ChildRefTemplate[], repeatContext: RepeatContext, errLoc: string): ChildRef[];
    parseChildRefs(layout: string, rest: string[], errLoc: string): ChildRefTemplate[];
    private parseChildRef;
    parseInt(str: string, min: number, error: string): number;
    parseIntOrWild(str: string | undefined, min: number, wild: number, sizes: Record<string, string>, error: string): number;
    setContainerClass(containerClassSuffix: string): void;
    private selector;
}
declare class ChildRef {
    readonly ref: string;
    private readonly isWildcard;
    readonly child?: Child | undefined;
    private readonly isExplicit;
    duplicateReference: boolean;
    static markDuplicates(parent: Child, holders: ChildRefHolder[], errLoc: string): void;
    constructor(ref: string, index: number, isWildcard?: boolean, child?: Child | undefined);
    die(parent: Child, error: string, context?: string): void;
}
interface ChildRefHolder {
    readonly childRef: ChildRef;
}
interface ChildRefTemplate {
    readonly selector: string;
    index: number;
}
declare class RepeatContext {
    readonly consumeAll: boolean;
    readonly selectorIncrement: Record<string, number>;
    indexIncrement: number;
    iteration: number;
    constructor(parent: Child, consumeAll: boolean, specs: string[], errLoc: string);
}

export { LayoutEa, LayoutEaCallback, LayoutEaConfig, LayoutEaGrid, LayoutEaMediaLayout, LayoutEaStrategy };
