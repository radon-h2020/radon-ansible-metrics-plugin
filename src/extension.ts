import * as vscode from 'vscode';
import * as path from 'path';
	
const thresholds:any = {avg_task_size: {q1: 4.0, median: 6.0, q3: 10.0, outlier: 19.0}, lines_blank: {q1: 1.0, median: 2.0, q3: 6.0, outlier: 13.5}, lines_code: {q1: 7.0, median: 16.0, q3: 36.0, outlier: 79.5}, lines_comment: {q1: 0.0, median: 0.0, q3: 2.0, outlier: 5.0}, num_conditions: {q1: 0.0, median: 0.0, q3: 2.0, outlier: 5.0}, num_decisions: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, num_distinct_modules: {q1: 0.0, median: 1.0, q3: 4.0, outlier: 10.0}, num_external_modules: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, num_filters: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, num_keys: {q1: 6.0, median: 13.0, q3: 30.0, outlier: 66.0}, num_loops: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, num_parameters: {q1: 0.0, median: 0.0, q3: 6.0, outlier: 15.0}, num_tasks: {q1: 1.0, median: 2.0, q3: 4.0, outlier: 8.5}, num_tokens: {q1: 17.0, median: 46.0, q3: 116.0, outlier: 264.5}, num_unique_names: {q1: 1.0, median: 2.0, q3: 5.0, outlier: 11.0}, num_vars: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, text_entropy: {q1: 3.75, median: 4.78, q3: 5.5, outlier: 8.125}}
const cp = require('child_process')

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('ansiblemetrics.run', (uri: vscode.Uri) => {
				
		const editor = vscode.window.activeTextEditor

		if(!editor || editor.document.languageId !== 'yaml')
			return
		
		let filePath = uri ? path.normalize(uri.path) : path.normalize(editor.document.uri.path)
		filePath = filePath.replace('\\c:', 'C:')

		const fileName = path.basename(filePath);

		// Create and show panel
		const panel = vscode.window.createWebviewPanel(
			'ansible-metrics',
			'Ansible metrics',
			vscode.ViewColumn.Two,
			{
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src', 'html'))],
				enableScripts: true
			}
		);

		// Run AnsibleMetrics on the file
		cp.exec(`ansible-metrics ${filePath} -o`, (err: any, stdout: any, stderr: any) => {
			if (err) {
				console.log('error: ' + err);
                panel.webview.html = getWebviewError(err.toString());
			}else if(stdout){
				// And set its HTML content
				let json_data = JSON.parse(stdout)
				json_data['filepath'] = fileName

				// Get path to resource on disk
				const onDiskPath = vscode.Uri.file(
					path.join(context.extensionPath, 'media', 'metrics-values.png')
				);
			
				// And get the special URI to use with the webview
				const metricsValueImgSrc = panel.webview.asWebviewUri(onDiskPath);
				panel.webview.html = getWebviewContent(json_data, metricsValueImgSrc)
			}
		});
	});

	context.subscriptions.push(disposable);

}

function getWebviewContent(data: JSON, metricsValueImgSrc:any) {

	let tbody:string = ''

	for (let [key, value] of Object.entries(data)) {
		let formatted_name = key.toLowerCase()
			.split('_')
			.map((s) => s.charAt(0).toUpperCase() + s.substring(1))
			.join(' ');
		
		let color_class = 'white'

		if(key in thresholds){
			if(value <= thresholds[key]['median']) color_class = 'white'
			else if(value <= thresholds[key]['q3']) color_class = 'yellow'
			else if(value <= thresholds[key]['outlier']) color_class = 'orange'
			else color_class = 'red'
			
			if(value != 0)
				tbody += `<tr><td>${formatted_name}</td><td class="${color_class}">${value}</td></tr>`
		}
	}
	
	console.log(metricsValueImgSrc)
	console.log(metricsValueImgSrc.path)


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
	
		<style> 
		.white {background: white;} 
		.green {background: green;} 
		.yellow {background: yellow;} 
		.orange {background: orange;} 
		.red {background: red;} 
		</style>
	</head>
	<body>

		<p align="center">
			<img src="https://github.com/radon-h2020/radon-ansible-metrics-plugin/raw/master/media/metric-values.png" width="300" />
		</p>

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
	</html>`
}


function getWebviewError(err: string){

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