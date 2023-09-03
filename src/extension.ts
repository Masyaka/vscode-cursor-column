import * as vscode from "vscode";

const { window, Range, workspace } = vscode;

let enabled = false;

const throttle = (fn: () => void, ms: number) => {
  let lastRun = Date.now();
  let timeout: any;
  return () => {
    const now = Date.now();
    if (lastRun + ms < now) {
      clearTimeout(timeout);
      timeout = null;
      lastRun = now;
      fn();
    } else if (!timeout) {
      timeout = setTimeout(fn, ms);
    }
  };
};

export async function activate(context: vscode.ExtensionContext) {
  let letterSpacing = 0;
  let wasVisible = cursorVisible();
  const highlighting: CursorHighlighting = {
    pos: new vscode.Position(0, 0),
  };

  const update = throttle(() => {
    console.log('render');
    const editor = window.activeTextEditor;
    const pos = window.activeTextEditor?.selection.active;
    if (!pos || !editor) {
      return {
        pos: new vscode.Position(0, 0),
      };
    }
    wasVisible = cursorVisible();
    highlighting.decoration?.dispose();
    highlighting.decoration = createDecoration(pos, editor, letterSpacing);
    highlighting.pos = pos;
  }, 20);

  const init = () => {
    letterSpacing =
      workspace.getConfiguration("editor").get<number>("letterSpacing") || 0;
    updateEnabled({
      onEnabled: async () => {
        update();
      },
      onDisabled: () => {
        highlighting.decoration?.dispose();
      },
    });
  };

  window.onDidChangeTextEditorSelection((e) => {
    if (cursorVisible()) {
      update();
    } else {
      setTimeout(update, 30);
    }
  });

  window.onDidChangeTextEditorVisibleRanges((e) => {
    const nowVisible = cursorVisible();
    if (nowVisible && wasVisible) {
      return;
    }
    update();
  });

  window.onDidChangeActiveColorTheme(async (e) => {
    update();
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

type CursorHighlighting = {
  pos: vscode.Position;
  decoration?: vscode.TextEditorDecorationType;
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
        top: -100vh;
        height: 200vh;
        position: absolute;
        margin-left: -${letterSpacing}px
        position: absolute;
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
      range: new Range(line, char, line, char),
    },
  ]);
  return decoration;
};
