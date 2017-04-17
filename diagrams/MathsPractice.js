var g_ExerciseArea;
var g_ExerciseType = "Column Addition";
var g_ExerciseCount = 12;

function RandomInt(minVal, maxVal)
{
	if (minVal == undefined)
		minVal = 1;

	if (maxVal == undefined)
		maxVal = 1000;

	return Math.floor(minVal + (maxVal-minVal+1) * Math.random());
}

function pad(num, digits)
{
	var s = num.toString();

	var pad = ["&nbsp", "&nbsp", "&nbsp", "&nbsp", "&nbsp", "&nbsp", "&nbsp", "&nbsp", "&nbsp", "&nbsp", "&nbsp", "&nbsp", "&nbsp"];

	if (digits > s.length)
		s = pad.slice(-(digits - s.length)).join("") + s;

	return s;
}

function update()
{
	while (g_ExerciseArea.firstChild) 
	{
		g_ExerciseArea.removeChild(g_ExerciseArea.firstChild);
	}

	var title = document.createElement('div');
	title.style.fontFamily = "Verdana,sans-serif";
	title.style.fontSize = "30";
	title.style.textAlign = "center";
	title.innerHTML = g_ExerciseType;
	title.style.marginBottom = "1cm";
	g_ExerciseArea.appendChild(title);

	var date = document.createElement('div');
	date.style.fontFamily = "Verdana,sans-serif";
	date.style.fontSize = "12";
	date.style.position = "absolute";
	date.style.top = 0;
	date.style.right = 0;
	date.style.height = "1cm";
	date.style.width = "4cm";
	date.style.textAlign = "left";
	date.style.borderBottom = "2px solid black";
	date.innerHTML = "Date:";
	g_ExerciseArea.appendChild(date);

	if (g_ExerciseType == "Column Addition")
	{
		for (var i=0; i!=g_ExerciseCount; ++i)
			columnAddition();
	}
}

function onLoad()
{
	body = document.getElementsByTagName("BODY")[0];

	var propertyGridDock = document.createElement('div');
	propertyGridDock.id = "propertyGrid";
	propertyGridDock.style.position = "fixed";
	propertyGridDock.style.right = 0;
	propertyGridDock.style.width = 350;
	propertyGridDock.style.border = "2px solid black";
	propertyGridDock.style.fontFamily = "Verdana,sans-serif";
	propertyGridDock.style.fontSize = "large";

	body.appendChild(propertyGridDock);

	propertyGrid = new PropertyGrid(propertyGridDock);
	propertyGrid.addProperty("Exercise", new Dropdown(["Column Addition", "Column Multiplication"], "Column Addition", function (value) { g_ExerciseType = value; update();	}));
	propertyGrid.addProperty("How Many?", new Slider(1, 64, g_ExerciseCount, 1, function (value) { g_ExerciseCount = value; update(); }) );


	g_ExerciseArea = document.createElement('div');
	g_ExerciseArea.id = "ExerciseArea";
	body.appendChild(g_ExerciseArea);

	update();
}

function columnAddition(showAnswer)
{
	var div = document.createElement("div");
	g_ExerciseArea.appendChild(div);
	div.style.width = "150";
	div.style.fontFamily = "Verdana,sans-serif";
	div.style.marginBottom = "1cm";
	div.style.display = "inline-block";

	var number1 = RandomInt();
	var number2 = RandomInt();

	var table = document.createElement("table");
	div.appendChild(table);
	table.style.fontSize = "24";

	with (table.insertRow().insertCell())
	{
		style.textAlign = "right";
		innerHTML = "  " + pad(number1,3);
	}

	with (table.insertRow().insertCell())
	{
		innerHTML = "+ " + pad(number2,3);
		style.borderBottom = "2px solid black";
	}

	with (table.insertRow().insertCell())
	{
		innerHTML = "&nbsp";
		style.borderBottom = "2px solid black";
	}
}