function SchoolGPS(divName, controlsDivName, showLocations, showSatellites, technique, locationCountOverride)
{
	var embeddedObj = new EmbeddedDrawing(divName);
	var scene = embeddedObj.getScene();
	var camera = embeddedObj.camera;
	var mapImage;
	var mapImageReady = false;

	var minRadius = 5.0;
	var maxRadius = 22.0;
	var radiusStep = 1.0;
	var threshold = 0.05;
	var minLocationCount = 5;
	var satelliteLocations = [];
	var locationIndex = -1;
	var showAllSolutions = false;
	var showMap = true;
	var gridSearchSpacing = 0.1;

	var locations = 
	[
		{ x: 11.0450, y: 12.6084 },		
		{ x:  6.1191, y: 22.0320 },		
		{ x: 25.2949, y: 15.2124 },	
		{ x: 19.4013, y: 10.6770 },	
		{ x:  7.3318, y: 17.2166 },		
		{ x:  9.2456, y:  6.4614 },		
		{ x:  5.3189, y: 35.9338 },		
		{ x: 17.0333, y: 13.5213 },	
		{ x: 17.3706, y: 20.2704 },	
	];

	var locationCount = (locationCountOverride>0) ? locationCountOverride : locations.length;

	function addControls()
	{
		if (controlsDivName == undefined)
			return;

		var showMapTick = new TickBox(showMap, function (value)
		{
			showMap = value;
			embeddedObj.draw();
		});

		var gridSearchSpacingSlider = new Slider(0.01, 0.15, gridSearchSpacing, 0.01, function (value)
		{
			gridSearchSpacing = value;
			embeddedObj.draw();
		});

		var locationSlider = new Slider(-1, locationCount-1, locationIndex, 1, function (value)
		{
			locationIndex = value;
			embeddedObj.draw();
		});

		var minLocationCountSlider = new Slider(4, locationCount-1, minLocationCount, 1, function (value)
		{
			minLocationCount = value;
			embeddedObj.draw();
		});
		
		var showAllSolutionsTickbox = new TickBox(showAllSolutions, function (value)
		{
			showAllSolutions = value;
			embeddedObj.draw();
		});

		var controls = new PropertyGrid(document.getElementById(controlsDivName));

		controls.addProperty("Show Map", showMapTick);
		if (technique == 2)
		{
			controls.addProperty("Grid search spacing", gridSearchSpacingSlider);
		}

		if (technique == 2 || technique == 3)
		{
			controls.addProperty("Min locations per satellite", minLocationCountSlider);
		}

		//controls.addProperty("Location Index", locationSlider);
		//controls.addProperty("Show All Known Solutions", showAllSolutionsTickbox);
	}

	function makeScene()
	{
		scene.deleteAllObjects();

		scene.name = "Light Transport";
		camera.setViewPosition(-3.7345613543428122, 11.67499501146912);
		camera.setUnitScale(13.081515030749209);

		var pageOutline = new PageOutline(new Vector(0, 0));
		pageOutline.sizeIndex = 2;
		pageOutline.visible = true;
		pageOutline.frozen = false;
		pageOutline.portrait = 1;
		pageOutline.margin = 2.5;
		pageOutline.onChange();
		scene.addObject(pageOutline);

		embeddedObj.zoomExtents();
	}

	function drawLiveStuff()
	{
		if (mapImageReady && showMap)
		{
			embeddedObj.camera.drawImage(new Vector(14.85 - 27/2, 21 + 36.2/2), mapImage, 27.0, 36.2);
		}

		if (showLocations)
		{
			for (var i=0; i!=locationCount; ++i)
			{
				embeddedObj.camera.drawCross(new Vector(locations[i].x, locations[i].y), 1, Math.PI/4, "#FF0000", 4);
				embeddedObj.camera.drawArc(locations[i], 1, 0, Math.PI*2, "#000000", 1);
			}
		}

			 if (technique == 0)	forwardGraphical(0.4, 0.8);
		else if (technique == 1)	forwardGraphical(0, 0.1);
		else if (technique == 2)	gridSearch(gridSearchSpacing);
		else if (technique == 3)	forwardAnalytical(true);
		else if (technique == 4)	knownSolution();
		else if (technique == 5)	preferredSolution();

		if (showSatellites)
		{
			removeDuplicateSatelliteLocations();
			//printSatelliteLocations();
			drawSatelliteLocations(false, locationIndex);
		}
	}

	function knownSolution()
	{
		satelliteLocations = [];

		satelliteLocations.push( {p: new Vector( 3.420, 10.290), locations: [0, 1, 3, 4, 5, 7] } );
		satelliteLocations.push( {p: new Vector( 9.570, 18.410), locations: [0, 1, 2, 5, 6, 8] } );
		satelliteLocations.push( {p: new Vector(12.360, 20.450), locations: [0, 2, 3, 4, 6, 8] } );
		satelliteLocations.push( {p: new Vector( 9.440, 21.460), locations: [0, 2, 5, 6, 7, 8] } );
		satelliteLocations.push( {p: new Vector(21.740, 24.510), locations: [0, 2, 3, 5, 6, 7] } );
		satelliteLocations.push( {p: new Vector(16.770, 27.500), locations: [0, 1, 2, 3, 4, 7] } );
		satelliteLocations.push( {p: new Vector(11.320, 30.590), locations: [0, 1, 4, 6, 7, 8] } );
	}

	function preferredSolution()
	{
		satelliteLocations = [];

		satelliteLocations.push( {p: new Vector( 3.420, 10.290), locations: [0, 1, 3, 4, 5, 7] } );
		satelliteLocations.push( {p: new Vector( 9.570, 18.410), locations: [0, 2, 6, 8] } );
		satelliteLocations.push( {p: new Vector(12.360, 20.450), locations: [3, 4] } );
		satelliteLocations.push( {p: new Vector( 9.440, 21.460), locations: [5, 7, 8] } );
		satelliteLocations.push( {p: new Vector(21.740, 24.510), locations: [0, 2, 5, 6, 7] } );
		satelliteLocations.push( {p: new Vector(16.770, 27.500), locations: [1, 2, 3] } );
		satelliteLocations.push( {p: new Vector(11.320, 30.590), locations: [0, 1, 4, 6, 7, 8] } );
	}

	// not perfect because it finds 2 exact results + some less than exact
	function forwardAnalytical(drawDetails)
	{
		satelliteLocations = [];

		for (var i=0; i!=locationCount; ++i)
		{
			var pi = locations[i];

			for (var j=i+1; j<locationCount; ++j)
			{
				var pj = locations[j];

				var dist = distance(pi, pj);

				if (dist / 2 > maxRadius)
					continue;

				var dir = sub(pi, pj).unit();
				var tan = transpose(dir);

				for (var radius_i=minRadius; radius_i<=maxRadius; radius_i += radiusStep)
				{
					for (var radius_j=minRadius; radius_j<=maxRadius; radius_j += radiusStep)
					{
						if (radius_i+radius_j < dist)
							continue;

						if (radius_i+dist < radius_j)
							continue;

						if (radius_j+dist < radius_i)
							continue;

						var t = (dist*dist - radius_j * radius_j + radius_i * radius_i) / (2 * dist * dist);
						var midPoint = lerp(pi, pj, t);
						var distMid = t * dist;

						var tanLength = Math.sqrt(radius_i*radius_i - distMid*distMid);

						// 2 exact results
						var p0 = mad(tan, tanLength, midPoint);
						var p1 = mad(tan, -tanLength, midPoint);

						var testPoints = [p0, p1];

						for (var testIndex=0; testIndex!=2; ++testIndex)
						{
							var testPoint = testPoints[testIndex];

							var validPoints = [];

							for (var k=0; k!=locationCount; ++k)
							{
								var pk = locations[k];

								var dist_t = distance(testPoint, pk);

								var error = Math.abs(dist_t/radiusStep - Math.floor(dist_t/radiusStep+0.5));

								if (error < threshold && dist_t >= minRadius && dist_t <= maxRadius)
								{
									validPoints.push(k);
								}
							}

							if (validPoints.length>=minLocationCount)
							{
								var satellite = { p: testPoint, locations: [] };

								for (var pp = 0; pp != validPoints.length; ++pp)
								{
									var p = locations[validPoints[pp]];

									var dist = distance(p, testPoint);

									satellite.locations.push(validPoints[pp]);

									if (drawDetails)
									{
										//embeddedObj.camera.drawArc(testPoint, dist, 0, Math.PI*2, "#000000", 1);
										embeddedObj.camera.drawLine(testPoint, p);
									}
								}

								satelliteLocations.push(satellite);

								if (drawDetails)
								{
									embeddedObj.camera.drawRectangle(testPoint, 0.5, "#000000", 1);
									embeddedObj.camera.drawText(testPoint, validPoints.length);
								}
							}
						}
					}
				}
			}
		}
	}

	function forwardGraphical(circleAlpha, intersectionAlpha)
	{
		for (var i=0; i!=locationCount; ++i)
		{
			var pi = locations[i];

			for (var j=i+1; j<locationCount; ++j)
			{
				var pj = locations[j];

				var dist = distance(pi, pj);
				var distQ = Math.ceil(dist/radiusStep) * radiusStep;

				if (distQ / 2 > maxRadius)
					continue;

				var dir = sub(pi, pj).unit();
				var tan = transpose(dir);

				var iCirclesDrawn = [];
				var jCirclesDrawn = [];

				for (var radius_i=minRadius; radius_i<=maxRadius; radius_i += radiusStep)
				{
					for (var radius_j=minRadius; radius_j<=maxRadius; radius_j += radiusStep)
					{
						if (radius_i+radius_j < dist)
							continue;

						if (radius_i+dist < radius_j)
							continue;

						if (radius_j+dist < radius_i)
							continue;

						var t = (dist*dist - radius_j * radius_j + radius_i * radius_i) / (2 * dist * dist);
						var midPoint = lerp(pi, pj, t);
						var distMid = t * dist;

						var tanLength = Math.sqrt(radius_i*radius_i - distMid*distMid);

						var p0 = mad(tan, tanLength, midPoint);
						var p1 = mad(tan, -tanLength, midPoint);

						//embeddedObj.camera.drawCross(p0, 0.1, 0, "#0044FF", 2);
						//embeddedObj.camera.drawCross(p1, 0.1, 0, "#0044FF", 2);
						if (intersectionAlpha>0)
						{
							if (p0.x>=0 && p0.x<=29.7 && p0.y>=0 && p0.y<=42)
								embeddedObj.camera.drawArc(p0, 0.1, 0, Math.PI*2, "#000000", 0, "rgba(0,0,0," + intersectionAlpha + ")");

							if (p1.x>=0 && p1.x<=29.7 && p1.y>=0 && p1.y<=42)
								embeddedObj.camera.drawArc(p1, 0.1, 0, Math.PI*2, "#000000", 0, "rgba(0,0,0," + intersectionAlpha + ")");
						}
						//embeddedObj.camera.drawArc(pi, radius_i, 0, Math.PI*2, "rgba(0,0,0,0.1)", 5);
						//embeddedObj.camera.drawArc(pj, radius_j, 0, Math.PI*2, "rgba(0,0,0,0.1)", 5);

						if (circleAlpha>0)
						{
							if (iCirclesDrawn.indexOf(radius_i) == -1)
							{
								iCirclesDrawn.push(radius_i);
								embeddedObj.camera.drawArc(pi, radius_i, 0, Math.PI*2, "rgba(0,0,0," + circleAlpha + ")", 1);
							}

							if (jCirclesDrawn.indexOf(radius_j) == -1)
							{
								jCirclesDrawn.push(radius_j);
								embeddedObj.camera.drawArc(pj, radius_j, 0, Math.PI*2, "rgba(0,0,0," + circleAlpha + ")", 1);
							}
						}
					}
				}
			}
		}
	}

	function gridSearchP(m, drawDetails)
	{
		var validPoints = [];

		for (var i=0; i!=locationCount; ++i)
		{
			var p = locations[i];

			var dist = distance(p, m);

			var error = Math.abs(dist/radiusStep - Math.floor(dist/radiusStep+0.5));

			if (error < threshold && dist >= minRadius && dist <= maxRadius)
			{
				validPoints.push(i);
			}
		}

		if (validPoints.length>=minLocationCount)
		{
			var satellite = { p: m, locations: [] };

			for (var i=0; i!=validPoints.length; ++i)
			{
				var p = locations[validPoints[i]];

				var dist = distance(p, m);

				if (drawDetails)
				{
					//embeddedObj.camera.drawArc(p, dist, 0, Math.PI*2, "#000000", 1);
					embeddedObj.camera.drawLine(p, m);
					//embeddedObj.camera.drawText(new Vector(m.x, m.y - i * embeddedObj.camera.invScale(20)), dist.toFixed(2));
				}

				satellite.locations.push(validPoints[i]);
			}

			satelliteLocations.push(satellite);

			if (drawDetails)
			{
				embeddedObj.camera.drawRectangle(m, 0.5, "#000000", 1);
				embeddedObj.camera.drawText(m, validPoints.length);
			}
		}
	}

	function gridSearch(step)
	{
		satelliteLocations = [];

		for (var x=0; x<=29.7; x+=step)
		{
			for (var y=0; y<=42.0; y+=step)
			{
				gridSearchP(new Vector(x,y), true);
			}
		}
	}

	function removeDuplicateSatelliteLocations()
	{
		satelliteLocations.sort(function (a, b) { return a.p.y < b.p.y ? -1 : 1; });

		for (var i=0; i!=satelliteLocations.length; ++i)
		{
			var pi = satelliteLocations[i].p;

			for (var j = i+1; j < satelliteLocations.length; ++j)
			{
				var pj = satelliteLocations[j].p;

				var dist = distance(pi, pj);

				if (dist < 0.2)
				{
					satelliteLocations.splice(j, 1);
					--j;
				}
			}
		}
	}

	function printSatelliteLocations()
	{
		console.log("Satellite locations:\n");

		for (var i=0; i!=satelliteLocations.length; ++i)
		{
			var sat = satelliteLocations[i].p;

			var logStr = "";

			logStr += i + ": " + (sat.x*10).toFixed(2) + ", " + (sat.y*10).toFixed(2) + ": ";

			logStr += " locations: ";
			for (var j = 0; j != satelliteLocations[i].locations.length; ++j)
			{
				logStr += satelliteLocations[i].locations[j] + ", ";
			}

			logStr += " distances: ";
			for (var j = 0; j != satelliteLocations[i].locations.length; ++j)
			{
				var dist = distance(satelliteLocations[i].p, locations[satelliteLocations[i].locations[j]]);

				logStr += dist.toFixed(1) + ", ";
			}

			logStr += "\n";
			console.log(logStr);
		}

		console.log("Distances from satellites:")
		for (var i = 0; i != locationCount; ++i)
		{
			console.log("Location " + (i+1) + ":");

			var loc = locations[i];

			for (var j = 0; j != satelliteLocations.length; ++j)
			{
				var sat = satelliteLocations[j].p;

				for (var k = 0; k != satelliteLocations[j].locations.length; ++k)
				{
					if (i == satelliteLocations[j].locations[k])
					{
						var dist = distance(loc, sat);
						console.log("\tSatellite " + (j+1) + " : " + dist.toFixed(0) + " cm");
					}
				}
			}
		}

	}

	function drawSatelliteLocations(drawDetails, locationIndex)
	{
		for (var i = 0; i != satelliteLocations.length; ++i)
		{
			embeddedObj.camera.drawRectangle(satelliteLocations[i].p, 1.5, "#FF0000", 1);
			embeddedObj.camera.drawCross(satelliteLocations[i].p, 0.3, 0, "#FF0000", 1);

			if (drawDetails)
			{
				for (var j = 0; j != satelliteLocations[i].locations.length; ++j)
				{
					if (locationIndex<0 || locationIndex == satelliteLocations[i].locations[j])
					{
						//embeddedObj.camera.drawArc(p, dist, 0, Math.PI*2, "#000000", 1);
						embeddedObj.camera.drawLine(satelliteLocations[i].p, locations[satelliteLocations[i].locations[j]], "#0000FF");
						//embeddedObj.camera.drawText(new Vector(m.x, m.y - i * embeddedObj.camera.invScale(20)), dist.toFixed(2));

						var dist = distance(satelliteLocations[i].p, locations[satelliteLocations[i].locations[j]]);
						embeddedObj.camera.drawArc(satelliteLocations[i].p, dist, 0, Math.PI * 2, "#000000", 1);
					}
				}
			}
		}
	}

	embeddedObj.onDraw = function ()
	{
		drawLiveStuff();
	}

	embeddedObj.onMouseMove = function (m, mp, buttons, ctrlKey, shiftKey)
	{
		//gridSearchP(m, true);
	}

	addControls();
	makeScene();
	embeddedObj.zoomExtents();

	mapImage = new Image();
	mapImage.src = "/examples/SchoolGPS_map.jpg";
	//mapImage.crossOrigin="anonymous";
	mapImage.onload = function() 
					{
						mapImageReady = true;
						embeddedObj.zoomExtents();
					};
}
