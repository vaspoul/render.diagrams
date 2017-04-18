var g_ExerciseArea;
var g_ExerciseList = [];
var g_ExerciseType = "Multiplication Pyramid";
var g_ExerciseCount = 12;
var g_RandomSeed = 1;

function RandomInt(minVal, maxVal)
{
	if (minVal == undefined)
		minVal = 1;

	if (maxVal == undefined)
		maxVal = 1000;

	return Math.floor(minVal + (maxVal-minVal+1) * pseudoRandom.random());
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
	title.style.fontSize = "30";
	title.style.textAlign = "center";
	title.innerHTML = g_ExerciseType;
	title.style.marginBottom = "0.5cm";
	g_ExerciseArea.appendChild(title);

	var date = document.createElement('div');
	date.style.fontSize = "12";
	date.style.width = "6cm";
	date.style.textAlign = "left";
	date.style.borderBottom = "2px solid black";
	date.innerHTML = "Date:".bold();
	date.style.marginBottom = "1cm";
	g_ExerciseArea.appendChild(date);

	pseudoRandom.seed = g_RandomSeed;

	g_ExerciseList = [	"Column Addition (with carry)", "Column Addition (without carry)", 
						"Column Subtraction (with carry)", "Column Subtraction (without carry)",
						"Column Multiplication",
						"Addition Pyramid", "Multiplication Pyramid", ];

	if (g_ExerciseType == "Column Addition (with carry)")
	{
		for (var i=0; i!=g_ExerciseCount; ++i)
			columnAddition(true, (i==0));
	}
	else if (g_ExerciseType == "Column Addition (without carry)")
	{
		for (var i=0; i!=g_ExerciseCount; ++i)
			columnAddition(false, (i==0));
	}
	else if (g_ExerciseType == "Column Subtraction (with carry)")
	{
		for (var i=0; i!=g_ExerciseCount; ++i)
			columnSubtraction(true, (i==0));
	}
	else if (g_ExerciseType == "Column Subtraction (without carry)")
	{
		for (var i=0; i!=g_ExerciseCount; ++i)
			columnSubtraction(false, (i==0));
	}
	else if (g_ExerciseType == "Column Multiplication")
	{
		for (var i=0; i!=g_ExerciseCount; ++i)
			columnMultiplication((i==0));
	}
	else if (g_ExerciseType == "Addition Pyramid")
	{
		for (var i=0; i!=g_ExerciseCount; ++i)
			pyramidAddition((i==0));
	}
	else if (g_ExerciseType == "Multiplication Pyramid")
	{
		for (var i=0; i!=g_ExerciseCount; ++i)
			pyramidMultiplication((i==0));
	}
}

function onLoad()
{
	body = document.getElementsByTagName("BODY")[0];

	g_ExerciseArea = document.createElement('div');
	g_ExerciseArea.id = "ExerciseArea";
	body.appendChild(g_ExerciseArea);

	var propertyGridDock = document.createElement('div');
	propertyGridDock.id = "propertyGrid";
	propertyGridDock.style.cssFloat = "left";
	propertyGridDock.style.marginLeft = "1cm";
	propertyGridDock.style.border = "1px solid black";
	//propertyGridDock.style.fontSize = "14";
	body.appendChild(propertyGridDock);


	update();

	propertyGrid = new PropertyGrid(propertyGridDock);
	propertyGrid.addProperty("Exercise", new Dropdown(g_ExerciseList, g_ExerciseType, function (value) { g_ExerciseType = value; update();	}));
	propertyGrid.addProperty("How Many?", new Slider(1, 64, g_ExerciseCount, 1, function (value) { g_ExerciseCount = value; update(); }) );
	propertyGrid.addProperty("Random Set", new Slider(1, 64, g_RandomSeed, 1, function (value) { g_RandomSeed = value; update(); }) );
}

function columnAddition(withCarry, showAnswer)
{
	var div = document.createElement("div");
	g_ExerciseArea.appendChild(div);
	div.style.width = "150";
	div.style.marginBottom = "1cm";
	div.style.display = "inline-block";

	var number1 = RandomInt(10,99);
	var number2 = RandomInt(10,99);

	if (!withCarry)
	{
		var s = number1.toString();
		number2 = 0;

		for (var i=0; i!=s.length; ++i)
		{
			number2 *= 10;
			number2 += RandomInt(0, 9-s[i]);
		}
	}

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

function columnSubtraction(withCarry, showAnswer)
{
	var div = document.createElement("div");
	g_ExerciseArea.appendChild(div);
	div.style.width = "150";
	div.style.marginBottom = "1cm";
	div.style.display = "inline-block";

	var number1 = RandomInt(10, 999);
	var number2 = RandomInt(10, number1);

	if (!withCarry)
	{
		var s = number1.toString();
		number2 = 0;
		for (var i=0; i!=s.length; ++i)
		{
			number2 *= 10;
			number2 += RandomInt(0, s[i]);
		}
	}

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
		innerHTML = "- " + pad(number2,3);
		style.borderBottom = "2px solid black";
	}

	with (table.insertRow().insertCell())
	{
		innerHTML = "&nbsp";
		style.borderBottom = "2px solid black";
	}
}

function columnMultiplication(showAnswer)
{
	var div = document.createElement("div");
	g_ExerciseArea.appendChild(div);
	div.style.width = "150";
	div.style.marginBottom = "1cm";
	div.style.display = "inline-block";

	var number1 = RandomInt(10, 99);
	var number2 = RandomInt(2,12);

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
		innerHTML = "x " + pad(number2,3);
		style.borderBottom = "2px solid black";
	}

	with (table.insertRow().insertCell())
	{
		innerHTML = "&nbsp";
		style.borderBottom = "2px solid black";
	}
}

function pyramidMultiplication(showAnswer)
{
	var div = document.createElement("div");
	g_ExerciseArea.appendChild(div);
	div.style.marginLeft = "0.5cm";
	div.style.marginRight = "0.5cm";
	div.style.marginBottom = "1cm";
	div.style.display = "inline-block";
	div.style.textAlign = "center";

	var number1 = RandomInt(2,12);
	var number2 = RandomInt(2,12);
	var number3 = RandomInt(2,12);

	var number4 = number1 * number2;
	var number5 = number2 * number3;

	var number6 = number4 * number5;

	var d;

	var d1 = d = document.createElement("div");
	div.appendChild(d);
	d.style.display = "inline-block";
	d.style.border = "1px solid black";
	d.style.fontSize = "24";
	d.style.margin = 2;
	d.innerHTML = number1;

	var d2 = d = document.createElement("div");
	div.appendChild(d);
	d.style.display = "inline-block";
	d.style.border = "1px solid black";
	d.style.fontSize = "24";
	d.style.margin = 2;
	d.innerHTML = number2;

	var d3 = d = document.createElement("div");
	div.appendChild(d);
	d.style.display = "inline-block";
	d.style.border = "1px solid black";
	d.style.fontSize = "24";
	d.style.margin = 2;
	d.innerHTML = number3;

	var d = document.createElement("div");
	div.appendChild(d);
	d.style.display = "block";

	var d4 = d = document.createElement("div");
	div.appendChild(d);
	d.style.display = "inline-block";
	d.style.border = "1px solid black";
	d.style.fontSize = "24";
	d.style.margin = 2;
	d.innerHTML = number4;

	var d5 = d = document.createElement("div");
	div.appendChild(d);
	d.style.display = "inline-block";
	d.style.border = "1px solid black";
	d.style.fontSize = "24";
	d.style.margin = 2;
	d.innerHTML = number5;

	var d = document.createElement("div");
	div.appendChild(d);
	d.style.display = "block";

	var d6 = d = document.createElement("div");
	div.appendChild(d);
	d.style.display = "inline-block";
	d.style.border = "1px solid black";
	d.style.fontSize = "24";
	d.style.margin = 2;
	d.innerHTML = number6;

	d1.style.width = d6.offsetWidth + "px";
	d2.style.width = d6.offsetWidth + "px";
	d3.style.width = d6.offsetWidth + "px";

	d4.style.width = d6.offsetWidth + "px";
	d5.style.width = d6.offsetWidth + "px";

	var type = RandomInt(1, 4);

	if (type == 1)
	{
		d4.style.color = "white";
		d5.style.color = "white";
	}

	d6.style.color = "white";

}