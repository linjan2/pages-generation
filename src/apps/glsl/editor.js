import {EditorView} from "@codemirror/view";

import {keymap, drawSelection, highlightActiveLine, dropCursor, lineNumbers, highlightActiveLineGutter} from "@codemirror/view";
import {syntaxHighlighting, indentOnInput, bracketMatching, foldGutter} from "@codemirror/language";
import {defaultKeymap, history, historyKeymap, indentWithTab, toggleComment} from "@codemirror/commands";
import {highlightSelectionMatches} from "@codemirror/search";
import {closeBrackets, closeBracketsKeymap} from "@codemirror/autocomplete";


import {javascript} from "@codemirror/lang-javascript";
import {json} from "@codemirror/lang-json";
import {css} from "@codemirror/lang-css";
import {html} from "@codemirror/lang-html";
import {markdown} from "@codemirror/lang-markdown";
import {python} from "@codemirror/lang-python";
import {cpp} from "@codemirror/lang-cpp";

import {HighlightStyle, StreamLanguage} from "@codemirror/language";
import {tags as t} from "@lezer/highlight";
import {yaml} from "@codemirror/legacy-modes/mode/yaml";

const chalky = "var(--chalky)",
  coral = "var(--coral)",
  cyan = "var(--cyan)",
  invalid = "var(--invalid)",
  ivory = "var(--ivory)",
  stone = "var(--stone)",
  malibu = "var(--malibu)",
  sage = "var(--sage)",
  whiskey = "var(--whiskey)",
  violet = "var(--violet)",
  dimColor = "var(--dim-color)",
  highlightBackground = "var(--bg-dim-color)", // gutter current line
  background = "var(--bg-color)",
  tooltipBackground = "var(--bg-dim-color);",
  selection = "var(--acc-color);",
  cursor = "var(--fg-color)";


const oneDarkTheme = EditorView.theme({
  "&": {
    color: ivory,
    backgroundColor: background
  },

  ".cm-content": {
    caretColor: cursor
  },

  ".cm-cursor, .cm-dropCursor": {borderLeftColor: cursor},
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {backgroundColor: selection},

  ".cm-panels": {backgroundColor: dimColor, color: ivory},
  ".cm-panels.cm-panels-top": {borderBottom: "2px solid black"},
  ".cm-panels.cm-panels-bottom": {borderTop: "2px solid black"},

  ".cm-searchMatch": {
    backgroundColor: "#72a1ff59",
    outline: "1px solid #457dff"
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#6199ff2f"
  },

  ".cm-activeLine": {backgroundColor: "#6699ff0b"},
  ".cm-selectionMatch": {backgroundColor: "#aafe661a"},

  "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
    backgroundColor: "#bad0f847",
    outline: "1px solid #515a6b"
  },

  ".cm-gutters": {
    backgroundColor: background,
    color: stone,
    border: "none"
  },

  ".cm-activeLineGutter": {
    backgroundColor: highlightBackground
  },

  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "#ddd"
  },

  ".cm-tooltip": {
    border: "none",
    backgroundColor: tooltipBackground
  },
  ".cm-tooltip .cm-tooltip-arrow:before": {
    borderTopColor: "transparent",
    borderBottomColor: "transparent"
  },
  ".cm-tooltip .cm-tooltip-arrow:after": {
    borderTopColor: tooltipBackground,
    borderBottomColor: tooltipBackground
  },
  ".cm-tooltip-autocomplete": {
    "& > ul > li[aria-selected]": {
      backgroundColor: highlightBackground,
      color: ivory
    }
  }
});
// }, {dark: true});

const highlightStyle = HighlightStyle.define([
  {tag: t.keyword,
    color: violet},
  {tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: coral},
  {tag: [t.function(t.variableName), t.labelName],
    color: malibu},
  {tag: [t.color, t.constant(t.name), t.standard(t.name)],
    color: whiskey},
  {tag: [t.definition(t.name), t.separator],
    color: ivory},
  {tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
    color: chalky},
  {tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)],
    color: cyan},
  {tag: [t.meta, t.comment],
    color: stone},
  {tag: t.strong,
    fontWeight: "bold"},
  {tag: t.emphasis,
    fontStyle: "italic"},
  {tag: t.strikethrough,
    textDecoration: "line-through"},
  {tag: t.link,
    color: stone,
    textDecoration: "underline"},
  {tag: t.heading,
    fontWeight: "bold",
    color: coral},
  {tag: [t.atom, t.bool, t.special(t.variableName)],
    color: whiskey },
  {tag: [t.processingInstruction, t.string, t.inserted],
    color: sage},
  {tag: t.invalid,
    color: invalid},
]);


function Editor(props) {
  return {
    $template: "#editor-template",
    lang: props.lang,
    view: null,
    // initialText: props.view.state.doc.toString(),
    initialText: props.doc,
    mounted() {
      // console.log("mounted");
      let codemirror = this.$refs.codemirror;
      console.assert(this.$refs.codemirror);

      const extensions = [
        oneDarkTheme,
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        syntaxHighlighting(highlightStyle, {fallback: true}),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
          {key: "Mod-'", run: toggleComment, preventDefault: true}
        ])
      ];

      switch (this.lang) {
      case "javascript":  { extensions.push(javascript());  } break;
      case "json":        { extensions.push(json());        } break;
      case "css":         { extensions.push(css());         } break;
      case "html":        { extensions.push(html());        } break;
      case "cpp":         { extensions.push(cpp());         } break;
      case "python":      { extensions.push(python());      } break;
      case "markdown":    { extensions.push(markdown());    } break;
      case "yaml":        { extensions.push(StreamLanguage.define(yaml)); } break;
      default: { throw new Error("Unhandled editor language", this.lang, codemirror); }
      }

      this.view = new EditorView({ doc: this.initialText, extensions, parent: codemirror });
      props.view = this.view;
    },
    reset() {
      this.view.dispatch({
        changes: {from: 0, to: this.view.state.doc.length, insert: this.initialText}
      });
    }
  };
}

let editors = [];
document.querySelectorAll(".editor").forEach(el => {
  const container = document.createElement("div");
  // container.setAttribute("class", "editor flex flex-row flex-collapse");
  container.setAttribute("class", "editor");
  // container.setAttribute("v-scope", "Editor({doc, lang})");
  container.setAttribute("v-scope", `Editor(editors[${editors.length}])`);
  container.setAttribute("v-on:vue:mounted", "mounted");
  // container.setAttribute("ref", "app");
  editors.push({
    doc: el.textContent.trim(),
    lang: el.dataset.lang
  });
  el.replaceWith(container);
});

export {
  Editor,
  editors
};

