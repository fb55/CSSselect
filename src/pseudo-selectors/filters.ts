import getNCheck from "nth-check";
import boolbase from "boolbase";
import type { CompiledQuery, InternalOptions, Adapter } from "../types.js";
import { attributeRules } from "../attributes";
import { AttributeAction, SelectorType } from "css-what";

export type Filter = <Node, ElementNode extends Node>(
    next: CompiledQuery<ElementNode>,
    text: string,
    options: InternalOptions<Node, ElementNode>,
    context?: Node[]
) => CompiledQuery<ElementNode>;

function getChildFunc<Node, ElementNode extends Node>(
    next: CompiledQuery<ElementNode>,
    adapter: Adapter<Node, ElementNode>
): CompiledQuery<ElementNode> {
    return (elem) => {
        const parent = adapter.getParent(elem);
        return parent != null && adapter.isTag(parent) && next(elem);
    };
}

export const filters: Record<string, Filter> = {
    contains(next, text, { adapter }) {
        return function contains(elem) {
            return next(elem) && adapter.getText(elem).includes(text);
        };
    },
    icontains(next, text, { adapter }) {
        const itext = text.toLowerCase();

        return function icontains(elem) {
            return (
                next(elem) &&
                adapter.getText(elem).toLowerCase().includes(itext)
            );
        };
    },

    // Location specific methods
    "nth-child"(next, rule, { adapter, equals }) {
        const func = getNCheck(rule);

        if (func === boolbase.falseFunc) return boolbase.falseFunc;
        if (func === boolbase.trueFunc) return getChildFunc(next, adapter);

        return function nthChild(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;

            for (let i = 0; i < siblings.length; i++) {
                if (equals(elem, siblings[i])) break;
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }

            return func(pos) && next(elem);
        };
    },
    "nth-last-child"(next, rule, { adapter, equals }) {
        const func = getNCheck(rule);

        if (func === boolbase.falseFunc) return boolbase.falseFunc;
        if (func === boolbase.trueFunc) return getChildFunc(next, adapter);

        return function nthLastChild(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;

            for (let i = siblings.length - 1; i >= 0; i--) {
                if (equals(elem, siblings[i])) break;
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }

            return func(pos) && next(elem);
        };
    },
    "nth-of-type"(next, rule, { adapter, equals }) {
        const func = getNCheck(rule);

        if (func === boolbase.falseFunc) return boolbase.falseFunc;
        if (func === boolbase.trueFunc) return getChildFunc(next, adapter);

        return function nthOfType(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;

            for (let i = 0; i < siblings.length; i++) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling)) break;
                if (
                    adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)
                ) {
                    pos++;
                }
            }

            return func(pos) && next(elem);
        };
    },
    "nth-last-of-type"(next, rule, { adapter, equals }) {
        const func = getNCheck(rule);

        if (func === boolbase.falseFunc) return boolbase.falseFunc;
        if (func === boolbase.trueFunc) return getChildFunc(next, adapter);

        return function nthLastOfType(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;

            for (let i = siblings.length - 1; i >= 0; i--) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling)) break;
                if (
                    adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)
                ) {
                    pos++;
                }
            }

            return func(pos) && next(elem);
        };
    },

    // TODO determine the actual root element
    root(next, _rule, { adapter }) {
        return (elem) => {
            const parent = adapter.getParent(elem);
            return (parent == null || !adapter.isTag(parent)) && next(elem);
        };
    },

    scope<Node, ElementNode extends Node>(
        next: CompiledQuery<ElementNode>,
        rule: string,
        options: InternalOptions<Node, ElementNode>,
        context?: Node[]
    ): CompiledQuery<ElementNode> {
        const { equals } = options;

        if (!context || context.length === 0) {
            // Equivalent to :root
            return filters["root"](next, rule, options);
        }

        if (context.length === 1) {
            // NOTE: can't be unpacked, as :has uses this for side-effects
            return (elem) => equals(context[0], elem) && next(elem);
        }

        return (elem) => context.includes(elem) && next(elem);
    },

    hover: dynamicStatePseudo("isHovered"),
    visited: dynamicStatePseudo("isVisited"),
    active: dynamicStatePseudo("isActive"),

    lang(next, data, options) {
        return attributeRules[AttributeAction.Equals](
            next,
            {
                type: SelectorType.Attribute,
                name: "lang",
                value: data,
                action: AttributeAction.Equals,
                ignoreCase: null,
                namespace: null,
            },
            options
        );
    },
};

/**
 * Dynamic state pseudos. These depend on optional Adapter methods.
 *
 * @param name The name of the adapter method to call.
 * @returns Pseudo for the `filters` object.
 */
function dynamicStatePseudo(
    name: "isHovered" | "isVisited" | "isActive"
): Filter {
    return function dynamicPseudo(next, _rule, { adapter }) {
        const func = adapter[name];

        if (typeof func !== "function") {
            return boolbase.falseFunc;
        }

        return function active(elem) {
            return func(elem) && next(elem);
        };
    };
}
