import * as vscode from "vscode";

const { window, ColorThemeKind, Range, workspace } = vscode;

let enabled = false;
export async function activate(context: vscode.ExtensionContext) {
  let decoration = await createDecoration(window.activeColorTheme.kind);
  const init = () => {
    updateEnabled({
      onEnabled: async() => {
        decoration = await createDecoration(window.activeColorTheme.kind);
        update(decoration);
      },
      onDisabled: () => {
        decoration.dispose();
      },
    });
  };

  window.onDidChangeTextEditorSelection((e) => {
    const end = e.selections[0]?.end;
    update(decoration, end);
  });

  window.onDidChangeActiveColorTheme(async (e) => {
    decoration.dispose();
    decoration = await createDecoration(e.kind);
    update(decoration);
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

function createPanel() {
  return window.createWebviewPanel(
    "theme-detector",
    "",
    {
      preserveFocus: true,
      viewColumn: vscode.ViewColumn.Beside,
    },
    {
      enableScripts: true,
      localResourceRoots: [],
    }
  );
}

const themeDetectorScript = `
<html>
  <body>
    <script>
    (function() {
      const vscode = acquireVsCodeApi();
      const color = getComputedStyle(document.documentElement).getPropertyValue('--vscode-cursorColumnColor');
      vscode.postMessage(color);
    })();
    </script>
  </body>
</html>
`;

const getColor = () =>
  new Promise((resolve) => {
    let panel = createPanel();
    const messageHandler = (color: any) => {
      if (panel) {
        panel.dispose();
      }
      resolve(color);
    };

    // After a second, just resolve as unknown.
    setTimeout(() => messageHandler(null), 500);

    panel.webview.onDidReceiveMessage(messageHandler, undefined, []);
    panel.webview.html = themeDetectorScript;
  });

const getDefaultColor = (kind: vscode.ColorThemeKind) =>
  [ColorThemeKind.Dark, ColorThemeKind.HighContrast].includes(kind)
    ? "rgba(255, 255, 255, 0.04)"
    : "rgba(0, 0, 0, 0.04)";

const update = (
  decoration: vscode.TextEditorDecorationType,
  pos: vscode.Position | undefined = window.activeTextEditor?.selection.end
) => {
  const editor = window.activeTextEditor;
  if (!pos || !editor) {
    return;
  }
  editor.setDecorations(decoration, [
    {
      range: new Range(
        pos.with({ character: pos.character }),
        pos.with({ character: pos.character + 1 })
      ),
    },
  ]);
};

const createDecoration = async (kind: vscode.ColorThemeKind) => {
  const color = await getColor();
  const decoration = window.createTextEditorDecorationType({
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    before: {
      textDecoration: `
				;box-sizing: content-box !important;
				width: calc(1ch);
				top: -50vh;
				height: 100vh;
				position: absolute;
				z-index: -100;
        border: none;
        background: linear-gradient(transparent, ${
          color || getDefaultColor(kind)
        }, transparent);
			`,
      contentText: "",
      border: "1px solid",
    },
  });
  return decoration;
};
