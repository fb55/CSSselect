import type { PseudoSelector } from "css-what";
import type { InternalOptions } from "../types.js";

type Pseudo = <Node, ElementNode extends Node>(
    elem: ElementNode,
    options: InternalOptions<Node, ElementNode>,
    subselect?: string | null,
) => boolean;

/**
 * CSS limits the characters considered as whitespace to space, tab & line
 * feed. We add carriage returns as htmlparser2 doesn't normalize them to
 * line feeds.
 *
 * @see {@link https://www.w3.org/TR/css-text-3/#white-space}
 */
const isDocumentWhiteSpace = /^[ \t\r\n]*$/;

/**
 * Only text controls can be made read-only, since for other controls (such
 * as checkboxes and buttons) there is no useful distinction between being
 * read-only and being disabled.
 *
 * @see {@link https://html.spec.whatwg.org/multipage/input.html#attr-input-readonly}
 */

const readonlyTypePattern =
    /^(?:text|search|url|tel|email|password|date|month|week|time|datetime-local|number)$/;

// While filters are precompiled, pseudos get called when they are needed
export const pseudos: Record<string, Pseudo> = {
    empty(elem, { adapter }) {
        const children = adapter.getChildren(elem);
        return (
            // First, make sure the tag does not have any element children.
            children.every((elem) => !adapter.isTag(elem)) &&
            // Then, check that the text content is only whitespace.
            children.every((elem) =>
                // FIXME: `getText` call is potentially expensive.
                isDocumentWhiteSpace.test(adapter.getText(elem)),
            )
        );
    },

    "first-child"(elem, { adapter, equals }) {
        if (adapter.prevElementSibling) {
            return adapter.prevElementSibling(elem) == null;
        }

        const firstChild = adapter
            .getSiblings(elem)
            .find((elem) => adapter.isTag(elem));
        return firstChild != null && equals(elem, firstChild);
    },
    "last-child"(elem, { adapter, equals }) {
        const siblings = adapter.getSiblings(elem);

        for (let i = siblings.length - 1; i >= 0; i--) {
            if (equals(elem, siblings[i])) return true;
            if (adapter.isTag(siblings[i])) break;
        }

        return false;
    },
    "first-of-type"(elem, { adapter, equals }) {
        const siblings = adapter.getSiblings(elem);
        const elemName = adapter.getName(elem);

        for (let i = 0; i < siblings.length; i++) {
            const currentSibling = siblings[i];
            if (equals(elem, currentSibling)) return true;
            if (
                adapter.isTag(currentSibling) &&
                adapter.getName(currentSibling) === elemName
            ) {
                break;
            }
        }

        return false;
    },
    "last-of-type"(elem, { adapter, equals }) {
        const siblings = adapter.getSiblings(elem);
        const elemName = adapter.getName(elem);

        for (let i = siblings.length - 1; i >= 0; i--) {
            const currentSibling = siblings[i];
            if (equals(elem, currentSibling)) return true;
            if (
                adapter.isTag(currentSibling) &&
                adapter.getName(currentSibling) === elemName
            ) {
                break;
            }
        }

        return false;
    },
    "only-of-type"(elem, { adapter, equals }) {
        const elemName = adapter.getName(elem);

        return adapter
            .getSiblings(elem)
            .every(
                (sibling) =>
                    equals(elem, sibling) ||
                    !adapter.isTag(sibling) ||
                    adapter.getName(sibling) !== elemName,
            );
    },
    "only-child"(elem, { adapter, equals }) {
        return adapter
            .getSiblings(elem)
            .every(
                (sibling) => equals(elem, sibling) || !adapter.isTag(sibling),
            );
    },
    "read-only"(elem, { adapter }) {
        const readonly = adapter.hasAttrib(elem, "readonly");
        if (!readonly) return false;

        const name = adapter.getName(elem);
        if (name === "textarea") return true;
        if (name !== "input") return false;

        const type = adapter.getAttributeValue(elem, "type");
        return !!type && readonlyTypePattern.test(type);
    },
    "read-write"(elem, { adapter }) {
        const readonly = adapter.hasAttrib(elem, "readonly");
        if (readonly) return false;

        const name = adapter.getName(elem);
        if (name === "textarea") return true;
        if (name !== "input") return false;

        const type = adapter.getAttributeValue(elem, "type");
        return !!type && readonlyTypePattern.test(type);
    },
};

export function verifyPseudoArgs<T extends Array<unknown>>(
    func: (...args: T) => boolean,
    name: string,
    subselect: PseudoSelector["data"],
    argIndex: number,
): void {
    if (subselect === null) {
        if (func.length > argIndex) {
            throw new Error(`Pseudo-class :${name} requires an argument`);
        }
    } else if (func.length === argIndex) {
        throw new Error(`Pseudo-class :${name} doesn't have any arguments`);
    }
}
