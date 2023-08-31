import * as vscode from "vscode";

const { window, Range, workspace } = vscode;

let enabled = false;
export async function activate(context: vscode.ExtensionContext) {
  let letterSpacing = 0;
  let decoration = update(undefined, letterSpacing);
  const init = () => {
    letterSpacing =
      workspace.getConfiguration("editor").get<number>("letterSpacing") || 0;
    updateEnabled({
      onEnabled: async () => {
        decoration = update(decoration, letterSpacing);
      },
      onDisabled: () => {
        decoration?.dispose();
      },
    });
  };

  window.onDidChangeTextEditorSelection((e) => {
    decoration = update(decoration, letterSpacing);
  });

  let wasVisible = cursorVisible();
  window.onDidChangeTextEditorVisibleRanges(() => {
    const nowVisible = cursorVisible();
    if (nowVisible && wasVisible) {
      return;
    }
    decoration = update(decoration, letterSpacing);
    wasVisible = nowVisible;
  });

  window.onDidChangeActiveColorTheme(async (e) => {
    decoration = update(decoration, letterSpacing);
  });

  workspace.onDidChangeConfiguration((e) => {
    if (
      e.affectsConfiguration("cursor-column.disabled") ||
      e.affectsConfiguration("editor.letterSpacing")
    ) {
      init();
    }
  });

  init();
}

export function deactivate() {}

const isEnabled = () =>
  workspace.getConfiguration("cursor-column").get<boolean>("disabled");

const updateEnabled = (cbs: {
  onEnabled: () => void;
  onDisabled: () => void;
}) => {
  enabled = isEnabled() ?? enabled;
  if (!enabled) {
    cbs.onEnabled();
  } else {
    cbs.onDisabled();
  }
};

const update = (
  decoration: vscode.TextEditorDecorationType | undefined = undefined,
  letterSpacing: number
) => {
  const editor = window.activeTextEditor;
  const pos = window.activeTextEditor?.selection.active;
  if (!pos || !editor) {
    return decoration;
  }
  const newDecoration = createDecoration(pos, editor, letterSpacing);
  decoration?.dispose();
  return newDecoration;
};

const cursorVisible = (
  position: vscode.Position | undefined = window.activeTextEditor?.selection
    .active,
  editor: vscode.TextEditor | undefined = window.activeTextEditor
) =>
  position &&
  editor &&
  editor.visibleRanges[0].start.line <= position.line &&
  editor.visibleRanges[editor.visibleRanges.length - 1].end.line >=
    position.line;

const createDecoration = (
  position: vscode.Position,
  editor: vscode.TextEditor,
  letterSpacing: number
) => {
  if (cursorVisible(position, editor)) {
    return createCursorBoundedDecoration(position, editor, letterSpacing);
  }
  return createIndependentDecoration(position, editor, letterSpacing);
};

const createIndependentDecoration = (
  position: vscode.Position,
  editor: vscode.TextEditor,
  letterSpacing: number
) => {
  const color = new vscode.ThemeColor("cursorColumnColor");
  const preCursorSymbols = editor.document
    .lineAt(position.line)
    .text.substring(0, position.character);
  const tabsCount = preCursorSymbols.split("\t").length - 1; // todo: is there faster way to count tabs? some another symbols can have another width
  const cursorChar =
    preCursorSymbols.length -
    tabsCount +
    tabsCount * +(editor.options.tabSize || 2);
  const letterSpacingOffset = preCursorSymbols.length * (letterSpacing || 0);
  const decoration = window.createTextEditorDecorationType({
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    before: {
      textDecoration: `
				;box-sizing: content-box !important;
				width: calc(1ch);
        left: calc(${cursorChar}ch + ${letterSpacingOffset}px);
				top: -10vh;
				height: 120vh;
				position: absolute;
				z-index: -100;
        border: none;
			`,
      backgroundColor: color,
      contentText: "",
      border: "1px solid",
    },
  });
  const line = editor.visibleRanges[0]?.start.line;
  editor.setDecorations(decoration, [
    {
      range: new Range(line, 0, line, 1),
    },
  ]);
  return decoration;
};

const createCursorBoundedDecoration = (
  position: vscode.Position,
  editor: vscode.TextEditor,
  letterSpacing: number
) => {
  const color = new vscode.ThemeColor("cursorColumnColor");
  const decoration = window.createTextEditorDecorationType({
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    before: {
      textDecoration: `
        ;box-sizing: content-box !important;
        width: calc(1ch);
        top: -50vh;
        height: 100vh;
        position: absolute;
        margin-left: -${letterSpacing}px
        z-index: -100;
        border: none;
			`,
      backgroundColor: color,
      contentText: "",
      border: "1px solid",
    },
  });
  const line = position.line;
  const char = position.character;
  editor.setDecorations(decoration, [
    {
      range: new Range(line, char, line, char + 1),
    },
  ]);
  return decoration;
};
