import * as vscode from "vscode";

const { window, Range, workspace } = vscode;

let enabled = false;
export async function activate(context: vscode.ExtensionContext) {
  let decoration = update();
  const init = () => {
    updateEnabled({
      onEnabled: async() => {
        decoration = update(decoration);
      },
      onDisabled: () => {
        decoration?.dispose();
      },
    });
  };

  window.onDidChangeTextEditorSelection((e) => {
    decoration = update(decoration);
  });

  window.onDidChangeTextEditorVisibleRanges(() => {
    decoration = update(decoration);
  });

  window.onDidChangeActiveColorTheme(async (e) => {
    decoration = update(decoration);
  });

  workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("cursor-column.disabled")) {
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
  pos: vscode.Position | undefined = window.activeTextEditor?.selection.active
) => {
  const editor = window.activeTextEditor;
  if (!pos || !editor) {
    return decoration;
  }
  const newDecoration = createDecoration(pos.character);
  const line = editor.visibleRanges[0]?.start.line;
  editor.setDecorations(newDecoration, [
    {
      range: new Range(line, 0, line, 1),
    },
  ]);
  decoration?.dispose();
  return newDecoration;
};

const createDecoration = (char: number) => {
  const color = new vscode.ThemeColor('cursorColumnColor');
  const decoration = window.createTextEditorDecorationType({
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    before: {
      textDecoration: `
				;box-sizing: content-box !important;
				width: calc(1ch);
        left: calc(${char}ch);
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
  return decoration;
};
