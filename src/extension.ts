import * as vscode from 'vscode';
import * as path from 'path';

const cp = require('child_process')
	
const thresholds:any = {avg_task_size: {q1: 4.0, median: 6.0, q3: 10.0, outlier: 19.0}, lines_blank: {q1: 1.0, median: 2.0, q3: 6.0, outlier: 13.5}, lines_code: {q1: 7.0, median: 16.0, q3: 36.0, outlier: 79.5}, lines_comment: {q1: 0.0, median: 0.0, q3: 2.0, outlier: 5.0}, num_conditions: {q1: 0.0, median: 0.0, q3: 2.0, outlier: 5.0}, num_decisions: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, num_distinct_modules: {q1: 0.0, median: 1.0, q3: 4.0, outlier: 10.0}, num_external_modules: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, num_filters: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, num_keys: {q1: 6.0, median: 13.0, q3: 30.0, outlier: 66.0}, num_loops: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, num_parameters: {q1: 0.0, median: 0.0, q3: 6.0, outlier: 15.0}, num_tasks: {q1: 1.0, median: 2.0, q3: 4.0, outlier: 8.5}, num_tokens: {q1: 17.0, median: 46.0, q3: 116.0, outlier: 264.5}, num_unique_names: {q1: 1.0, median: 2.0, q3: 5.0, outlier: 11.0}, num_vars: {q1: 0.0, median: 0.0, q3: 1.0, outlier: 2.5}, text_entropy: {q1: 3.75, median: 4.78, q3: 5.5, outlier: 8.125}}
const metrics_description:any = {
	avg_task_size: "Average number of code lines in tasks: LinesCode(tasks)/NumTasks. Interpretation: the higher the more complex and the more challenging to maintain the blueprint.", 
	lines_blank: "Total number of empty lines.", 
	lines_code: "Total number of executable source code lines. Interpretation: the more the lines of code, the more complex and the more challenging to maintain the blueprint.", 
	lines_comment: "Total number of commented lines (i.e., starting with #).",
	num_conditions: "Total number of conditions, measured counting the occurrences of the following operators in 'when' statements: is, in, ==, !=, >, >=, <, <=. Interpretation: the more the conditions, the more complex and the more challenging to maintain the blueprint.", 
	num_decisions: "Total number of conditions, measured counting the occurrences of the following operators in 'when' statements:  and, or, not. Interpretation: the more the decisions, the more complex and the more challenging to maintain the blueprint.",
	num_deprecated_modules: "Count the occurrences of deprecated modules. Deprecated modules usage is discouraged as they are kept for backward compatibility only. Interpretation: the more the deprecated modules, the more difficult it is to maintain and evolve the code. In addition, the higher the likelihood to crash if the current system does not support retro-compatibility.", 
	num_distinct_modules: "Count the distinct modules in the script. Modules are reusable and standalone scripts called by tasks. They allow to change or get information about the state of the system and can be interpreted as a degree of responsibility of the blueprint. Therefore, a blueprint consisting of many distinct modules might be less self-contained and potentially affect the complexity and maintainability of the system, as it is responsible for executing many different tasks rather than a task several times with different options, for example, to ensure the presence of dependencies in the system. Interpretation: the more the distinct modules, the more challenging to maintain the blueprint.", 
	num_external_modules: "Count occurrences of modules created by the users and not maintained by the Ansible community. Interpretation: The more the external modules, the more challenging to maintain the blueprint and the higher the chance of system’s misbehavior",
	num_filters: "Count of '|' syntax occurrences inside {{*}} expressions. Filters transform the data of a template expression, for example, for formatting or rendering them. Although they allow for transforming data in a very compact way, filters can be concatenated to perform a sequence of different actions. Interpretation: the more the filters, the lower the readability and the more challenging to maintain the blueprint.",
	num_keys: "Count of keys in the dictionary representing a playbook or tasks",
	num_loops: "Count of 'loop' and 'with_*' syntax occurrences",
	num_parameters: "Count the total number of parameters, that is, the keys of the dictionary representing a module. In Ansible parameters (or arguments) describe the desired state of the system. Interpretation: the more the parameters, the more challenging to debug and test the blueprint.",
	num_tasks: "Measures the number of functions in a script. An Ansible task is equivalent to a method, as its goal is to execute a module with very specific arguments. Interpretation: the higher the number of tasks, the more complex and the more challenging to maintain the blueprint.",
	num_tokens: "Count the words separated by a blank space. Interpretation: the more the tokens, the more complex is the blueprint.",
	num_unique_names: "Number of plays and tasks with a unique name. Uniquely naming plays and tasks is a best practice to locate problematic tasks quickly. Duplicate names may lead to not deterministic or at least not obvious behaviors. Interpretation: the more the entities with unique names the higher the maintainability and readability of the blueprint.",
	num_vars: "Number of variables in the playbook.",
	text_entropy: "Mesures the complexity of a script based on its information content, analogous to the class entropy complexity. Interpretation: the higher the entropy, the more challenging to maintain the blueprint."}

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

				panel.webview.html = getWebviewContent(json_data)
			}
		});
	});

	context.subscriptions.push(disposable);

}

function getWebviewContent(data: JSON) {

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
			
			if(key == 'num_unique_names'){
				const iqr = thresholds[key]['q1'] + thresholds[key]['q3']
				if(value >= thresholds[key]['median']) color_class = 'white'
				else if(value >= thresholds[key]['q1']) color_class = 'yellow'
				else if(value >= thresholds[key]['q1'] - 1.5*iqr) color_class = 'orange'
				else color_class = 'red'
			}
			
			if(value != 0)
				tbody += `<tr><td>${formatted_name} <span type="button" data-toggle="tooltip" data-placement="bottom" title="${metrics_description[key]}">&#9432;</span></td><td class="${color_class}">${value}</td></tr>`
		}
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