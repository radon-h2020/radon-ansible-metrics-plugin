"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const cp = require('child_process');
function activate(context) {
    let disposable = vscode.commands.registerCommand('ansiblemetrics.run', (uri) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'yaml')
            return;
        let filePath = uri ? uri.path : editor.document.uri.path;
        const fileName = path.basename(filePath);
        // Create and show panel
        const panel = vscode.window.createWebviewPanel('ansible-metrics', 'Ansible metrics', vscode.ViewColumn.Two, {
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src', 'html'))],
            enableScripts: true
        });
        // Run AnsibleMetrics on the file
        cp.exec(`ansible-metrics ${filePath} -o`, (err, stdout, stderr) => {
            if (err) {
                console.log('error: ' + err);
                panel.webview.html = getWebviewError(err.toString());
            }
            else if (stdout) {
                // And set its HTML content
                let json_data = JSON.parse(stdout);
                json_data['filepath'] = fileName;
                panel.webview.html = getWebviewContent(json_data);
            }
        });
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function getWebviewContent(data) {
    let tbody = '';
    for (let [key, value] of Object.entries(data)) {
        let new_key = key.toLowerCase()
            .split('_')
            .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');
        tbody += generateHtmlTableRow(new_key, value);
    }
    return `
	<!doctype html>
	<html lang="en">
	<head>
		<!-- Required meta tags -->
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
		<title>AnsibleMetrics</title>

		<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
		<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.3/css/all.css" integrity="sha384-UHRtZLI+pbxtHCWp1t77Bi1L4ZtiqrqD80Kn4Z8NTSRyMA2Fd33n5dQ8lWUE00s/" crossorigin="anonymous">
		<link rel="stylesheet" href="https://unpkg.com/bootstrap-table@1.16.0/dist/bootstrap-table.min.css">
	</head>
	<body>
		<table data-toggle="table">
		<thead>
			<tr>
			<th>Metric</th>
			<th>Value</th>
			</tr>
		</thead>
		<tbody>
		${tbody}
		</tbody>
		</table>

		<!-- Footer -->
		<footer class="py-5 bg-dark">
			<div class="container">
			<p class="m-0 text-center">
				<i class="fab fa-github" style="color: white;"></i>
				<a href="https://github.com/radon-h2020/radon-ansible-metrics" class="m-0 text-center text-white">Github</a>
			</p>
			</div>
			<div class="container">
			<p class="m-0 text-center text-white">
			<i class="fas fa-book"></i>
			<a href="https://radon-h2020.github.io/radon-ansible-metrics/" class="m-0 text-center text-white">Documentation</a>
			</p>
			</div>
			<!-- /.container -->
		</footer> 
  

		<script src="https://code.jquery.com/jquery-3.3.1.min.js" integrity="sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8=" crossorigin="anonymous"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
		<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
		<script src="https://unpkg.com/bootstrap-table@1.16.0/dist/bootstrap-table.min.js"></script>
	</body>
	</html>`;
}
function generateHtmlTableRow(name, value) {
    // generate a HTML table row as follows: <tr><td>name</td><td>value</td></tr>
    return `<tr><td>${name}</td><td>${value}</td></tr>`;
}
function getWebviewError(err) {
    return `
	<!doctype html>
	<html lang="en">
	<head>
		<!-- Required meta tags -->
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
		<title>AnsibleMetrics</title>

		<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
		<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.3/css/all.css" integrity="sha384-UHRtZLI+pbxtHCWp1t77Bi1L4ZtiqrqD80Kn4Z8NTSRyMA2Fd33n5dQ8lWUE00s/" crossorigin="anonymous">
	</head>
	<body>
		<div class="alert alert-danger">
          <strong>Warning!</strong> Some problems occurred!
          ${err}.
        </div>

		<!-- Footer -->
		<footer class="py-5 bg-dark">
			<div class="container">
			<p class="m-0 text-center">
				<i class="fab fa-github" style="color: white;"></i>
				<a href="https://github.com/radon-h2020/radon-ansible-metrics" class="m-0 text-center text-white">Github</a>
			</p>
			</div>
			<div class="container">
			<p class="m-0 text-center text-white">
			<i class="fas fa-book"></i>
			<a href="https://radon-h2020.github.io/radon-ansible-metrics/" class="m-0 text-center text-white">Documentation</a>
			</p>
			</div>
			<!-- /.container -->
		</footer>

		<script src="https://code.jquery.com/jquery-3.3.1.min.js" integrity="sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8=" crossorigin="anonymous"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
		<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
	</body>
	</html>`;
}
//# sourceMappingURL=extension.js.map