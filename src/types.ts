import type { Selector } from "css-what";

export type InternalSelector = Selector | { type: "_flexibleDescendant" };

export type Predicate<Value> = (v: Value) => boolean;
export interface Adapter<Node, ElementNode extends Node> {
    /**
     *  Is the node a tag?
     */
    isTag: (node: Node) => node is ElementNode;

    /**
     * Does at least one of passed element nodes pass the test predicate?
     */
    existsOne: (test: Predicate<ElementNode>, elems: Node[]) => boolean;

    /**
     * Get the attribute value.
     */
    getAttributeValue: (elem: ElementNode, name: string) => string | undefined;

    /**
     * Get the node's children
     */
    getChildren: (node: Node) => Node[];

    /**
     * Get the name of the tag
     */
    getName: (elem: ElementNode) => string;

    /**
     * Get the parent of the node
     */
    getParent: (node: ElementNode) => ElementNode | null;

    /**
     * Get the siblings of the node. Note that unlike jQuery's `siblings` method,
     * this is expected to include the current node as well
     */
    getSiblings: (node: Node) => Node[];

    /**
     * Get the text content of the node, and its children if it has any.
     */
    getText: (node: Node) => string;

    /**
     * Does the element have the named attribute?
     */
    hasAttrib: (elem: ElementNode, name: string) => boolean;

    /**
     * Takes an array of nodes, and removes any duplicates, as well as any
     * nodes whose ancestors are also in the array.
     */
    removeSubsets: (nodes: Node[]) => Node[];

    /**
     * Finds all of the element nodes in the array that match the test predicate,
     * as well as any of their children that match it.
     */
    findAll: (test: Predicate<ElementNode>, nodes: Node[]) => ElementNode[];

    /**
     * Finds the first node in the array that matches the test predicate, or one
     * of its children.
     */
    findOne: (
        test: Predicate<ElementNode>,
        elems: Node[]
    ) => ElementNode | null;

    /**
     * The adapter can also optionally include an equals method, if your DOM
     * structure needs a custom equality test to compare two objects which refer
     * to the same underlying node. If not provided, `css-select` will fall back to
     * `a === b`.
     */
    equals?: (a: Node, b: Node) => boolean;

    /**
     * Is the element in hovered state?
     */
    isHovered?: (elem: ElementNode) => boolean;

    /**
     * Is the element in visited state?
     */
    isVisited?: (elem: ElementNode) => boolean;

    /**
     * Is the element in active state?
     */
    isActive?: (elem: ElementNode) => boolean;
}

export interface Options<Node, ElementNode extends Node> {
    /**
     * When enabled, tag names will be case-sensitive.
     *
     * @default false
     */
    xmlMode?: boolean;
    /**
     * Limits the module to only use CSS3 selectors.
     *
     * @default false
     */
    strict?: boolean;
    /**
     * The last function in the stack, will be called with the last element
     * that's looked at.
     */
    rootFunc?: (element: ElementNode) => boolean;
    /**
     * The adapter to use when interacting with the backing DOM structure. By
     * default it uses the `domutils` module.
     */
    adapter?: Adapter<Node, ElementNode>;
    /**
     * The context of the current query. Used to limit the scope of searches.
     * Can be matched directly using the `:scope` pseudo-selector.
     */
    context?: ElementNode | ElementNode[];
    /**
     * Allow css-select to cache results for some selectors, sometimes greatly
     * improving querying performance. Disable this if your document can
     * change in between queries with the same compiled selector.
     *
     * @default true
     */
    cacheResults?: boolean;
}

// Internally, we want to ensure that no propterties are accessed on the passed objects
export interface InternalOptions<Node, ElementNode extends Node>
    extends Options<Node, ElementNode> {
    adapter: Adapter<Node, ElementNode>;
    equals: (a: Node, b: Node) => boolean;
}

export interface CompiledQuery<ElementNode> {
    (node: ElementNode): boolean;
    shouldTestNextSiblings?: boolean;
}
export type Query<ElementNode> = string | CompiledQuery<ElementNode>;
export type CompileToken<Node, ElementNode extends Node> = (
    token: InternalSelector[][],
    options: InternalOptions<Node, ElementNode>,
    context?: ElementNode[]
) => CompiledQuery<ElementNode>;
