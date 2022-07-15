// ----------------------------------------------------------------------------------------------------------------
// Function Graph
// ----------------------------------------------------------------------------------------------------------------
var lastFunctionGraphAppearance = new Appearance("#4286f4", 1, 2, "#FF7F00", 0.5);

function FunctionGraph(origin)
{
	this.scene						= null;
	this.origin						= origin;
	this.xAxis						= new Vector(1,0);
	this.yAxis						= new Vector(0,1);
	this.coordinateType				= 0;
	this.xMin						= -5;
	this.xMax						= 5;
	this.yLimitMin					= -5;
	this.yLimitMax					= 5;
	this.evalStep					= 0.25;
	this.xLabel						= 0;
	this.showXAxis					= true;
	this.xLabelStep					= 1;
	this.xLabelDecimals				= 0;
	this.xGridlines					= false;
	this.yLabel						= 0;
	this.showYAxis					= true;
	this.yLabelStep					= 1;
	this.yLabelDecimals				= 0;
	this.yGridlines					= false;
	this.evaluateOnMouseCursor		= true;
	this.showAverage				= false;
	this.doConvolution				= false;
	this.doRayCasting				= true;
	this.graphOriginLocal			= new Vector(0,0);	// where is the graph (0,0) in local space coordinates relative the object origin
	this.graphOrigin;									// graph (0,0) expressed in world space coords
	this.selected					= false;
	this.visible					= true;
	this.frozen						= false;
	this.appearance					= lastFunctionGraphAppearance.copy();
	this.yFunction					= undefined;
	this.convolutionFunction		= undefined;
	this.convolutionFunctionMinX	= 0;
	this.convolutionFunctionMaxX	= 0;
	this.graphFunction				= function() { return 1; };
	this.onChangeListeners			= [];
	this.boundsMin					= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax					= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);
	this.yFunctionValues			= undefined;
	this.convolutionFunctionValues	= undefined;
	this.useCache					= true;

	this.functionStr			= 
		"// Type your function here, using valid JavaScript.\n"+
		"//\n" +
		"// Parameters:\n" +
		"// \tx: [Cartesian] The value on the X axis on which the function needs to be evaluated at.\n" +
		"// \tx: [Polar] The angle, in radians, which the function needs to be evaluated at.\n" +
		"//\n" +
		"// \thitDistance: [Cartesian] A ray is shot along the Y axis, starting at each evaluation position.\n" +
		"// \thitDistance: [Polar] A ray is shot for each evaluation direction.\n"+
		"//	\t			     If it hits something, hitDistance containts the distance to the hit.\n" +
		"//	\t			     If it doesn't hit anything, it's set to undefined.\n" +
		"//\n" +
		"// Expected Return:\n" +
		"// \tA single number (scalar float) that is the evalution of the function for the specified input.\n" +
		"\n" +
		"return Math.sin(x/3.14159*2)*5;";

	this.convolutionFunctionStr	= 
		"// Type your convolution function here, using valid JavaScript.\n"+
		"//\n" +
		"// Parameters:\n" +
		"// \tdx: [Cartesian] The distance along the X axis from the center value that the convolution function needs to be evaluated at." +
		"// \tdx: [Polar] The angle, in radians, from the center value that the convolution function needs to be evaluated at.\n" +
		"//\n" +
		"// Expected Return:\n" +
		"// \tA single number (scalar float) that is the evalution of the convolution function for the specified input.\n" +
		"\n" +
		"return 1-saturate(Math.abs(dx)/1);";

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var functionGraph = new FunctionGraph(";

		str += "new Vector(" + this.origin.x + ", " + this.origin.y + ")";
		str += ");\n";

		str += this.appearance.saveAsJavascript("functionGraph");
		str += "functionGraph.functionStr = unescape(\"" + escape(this.functionStr) + "\");\n";
		str += "functionGraph.convolutionFunctionStr = unescape(\"" + escape(this.convolutionFunctionStr) + "\");\n";
		str += "functionGraph.coordinateType = " + this.coordinateType + ";\n";
		str += "functionGraph.xAxis = new Vector(" + this.xAxis.x + ", " + this.xAxis.y + ");\n";
		str += "functionGraph.xMin = " + this.xMin + ";\n";
		str += "functionGraph.xMax = " + this.xMax + ";\n";
		str += "functionGraph.evalStep = " + this.evalStep + ";\n";
		str += "functionGraph.xLabel = " + this.xLabel + ";\n";
		str += "functionGraph.showXAxis = " + this.showXAxis + ";\n";
		str += "functionGraph.xLabelStep = " + this.xLabelStep + ";\n";
		str += "functionGraph.xLabelDecimals = " + this.xLabelDecimals + ";\n";
		str += "functionGraph.xGridlines = " + this.xGridlines + ";\n";
		str += "functionGraph.yLabel = " + this.yLabel + ";\n";
		str += "functionGraph.showYAxis = " + this.showYAxis + ";\n";
		str += "functionGraph.yLabelStep = " + this.yLabelStep + ";\n";
		str += "functionGraph.yLabelDecimals = " + this.yLabelDecimals + ";\n";
		str += "functionGraph.yGridlines = " + this.yGridlines + ";\n";
		str += "functionGraph.evaluateOnMouseCursor = " + this.evaluateOnMouseCursor + ";\n";
		str += "functionGraph.showAverage = " + this.showAverage + ";\n";
		str += "functionGraph.doConvolution = " + this.doConvolution + ";\n";
		str += "functionGraph.doRayCasting = " + this.doRayCasting + ";\n";
		str += "functionGraph.yLimitMin = " + this.yLimitMin + ";\n";
		str += "functionGraph.yLimitMax = " + this.yLimitMax + ";\n";
		str += "functionGraph.graphOriginLocal = new Vector(" + this.graphOriginLocal.x + ", " + this.graphOriginLocal.y + ");\n";
		str += "functionGraph.visible = " + this.visible + ";\n";
		str += "functionGraph.frozen = " + this.frozen + ";\n";
		str += "functionGraph.yFunction = undefined;\n";
		str += "functionGraph.convolutionFunction = undefined;\n";

		str += "functionGraph.onChange();\n";
		str += "scene.addObject(functionGraph);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.precalculateValues = function()
	{
		if (this.scene == undefined)
		{
			this.yFunctionValues = undefined;
			this.convolutionFunctionValues = undefined;
			return;
		}

		var evalStep = Math.max(this.evalStep, 0.01);

		var precalcMinX = this.xMin;
		var precalcMaxX = this.xMax;

		// Scan for smallest range of non-zero values in the convolution function
		if (this.doConvolution)
		{
			this.convolutionFunctionMinX = (this.coordinateType == 0) ? -(this.xMax-this.xMin)/2 : (-Math.PI);
			this.convolutionFunctionMaxX = (this.coordinateType == 0) ? (this.xMax-this.xMin)/2 : (+Math.PI);

			for (var dx = this.convolutionFunctionMinX; dx <= this.convolutionFunctionMaxX; dx += evalStep)
			{
				if (Math.abs(this.convolutionFunction(dx)) >= 0.0001)
				{
					this.convolutionFunctionMinX = (Math.round(dx/evalStep)-1) * evalStep;
					break;
				}
			}

			for (var dx = this.convolutionFunctionMaxX; dx >= this.convolutionFunctionMinX; dx -= evalStep)
			{
				if (Math.abs(this.convolutionFunction(dx)) >= 0.0001)
				{
					this.convolutionFunctionMaxX = (Math.round(dx/evalStep)+1) * evalStep;
					break;
				}
			}

			precalcMinX = this.xMin + this.convolutionFunctionMinX;
			precalcMaxX = this.xMax + this.convolutionFunctionMaxX;
		}
		
		// Evaluate yFunction for all discrete steps and store the results
		{
			this.yFunctionValues = new Array( Math.ceil( (precalcMaxX - precalcMinX) / evalStep ) + 2);

			var index = 0;
			for (var x = precalcMinX; x <= precalcMaxX+evalStep; x += evalStep)
			{
				var hitDistance = undefined;

				if (this.coordinateType == 0)
				{
					var p = this.graphOrigin.copy();
					p = add(p, mul(this.xAxis, x));

					var bestHit = this.scene.rayHitTest(p, this.yAxis);

					if (bestHit.hit)
					{
						hitDistance = bestHit.tRay;
					}
				}
				else
				{
					var bestHit = this.scene.rayHitTest(this.graphOrigin, fromAngle(x));

					if (bestHit.hit)
					{
						hitDistance = bestHit.tRay;
					}
				}

				this.yFunctionValues[index] = this.yFunction(x, hitDistance, x);

				++index;
			}
		}

		// Evaluate convolutionFunction for all discrete steps and store the results
		if (this.doConvolution)
		{
			var count = Math.ceil((this.convolutionFunctionMaxX - this.convolutionFunctionMinX) / evalStep) + 2;

			this.convolutionFunctionValues = new Array(count);

			var index = 0;
			for (var dx = this.convolutionFunctionMinX; dx <= this.convolutionFunctionMaxX+evalStep; dx += evalStep)
			{
				this.convolutionFunctionValues[index] = this.convolutionFunction(dx);
				++index;
			}
		}
	}

	this.onSceneChange = function(caller, changeDetails)
	{
		if (changeDetails && changeDetails.blockersMoved)
		{
			this.precalculateValues();
		}
	}

	this.compileFunctions = function()
	{
		if (this.yFunction == undefined)
		{
			try
			{
				this.yFunction = Function("x", "hitDistance", "baseX", this.functionStr).bind(this);
			}
			catch (e)
			{
				if (e instanceof SyntaxError) 
				{
					alert(e.message);
				}

				this.yFunction = function() { return 1; }
			}
		}

		if (this.convolutionFunction == undefined)
		{
			try
			{
				this.convolutionFunction = Function("dx", this.convolutionFunctionStr).bind(this);
			}
			catch (e)
			{
				if (e instanceof SyntaxError) 
				{
					alert(e.message);
				}

				this.convolutionFunction = function() { return 1; }
			}
		}
	}

	this.onChange = function(changeDetails)
	{
		if (this.scene != undefined)
		{
			this.scene.removeChangeListener(this);
		}

		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.compileFunctions();

		this.precalculateValues();

		lastFunctionGraphAppearance = this.appearance.copy();

		this.yAxis = transpose(this.xAxis).neg();
		this.graphOrigin = add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x), mul(this.yAxis, this.graphOriginLocal.y) ));

		this.boundsMin = this.origin;
		this.boundsMax = this.origin;

		if (this.coordinateType == 0)
		{
			this.boundsMin = min(add(this.graphOrigin, add(mul(this.xAxis, this.xMin), mul(this.yAxis, this.yLimitMin)) ), this.boundsMin);
			this.boundsMax = max(add(this.graphOrigin, add(mul(this.xAxis, this.xMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMax);
		}
		else
		{
			this.boundsMin = min(sub(this.graphOrigin, add(mul(this.xAxis, this.yLimitMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMin);
			this.boundsMin = min(add(this.graphOrigin, add(mul(this.xAxis, this.yLimitMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMin);

			this.boundsMax = max(sub(this.graphOrigin, add(mul(this.xAxis, this.yLimitMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMax);
			this.boundsMax = max(add(this.graphOrigin, add(mul(this.xAxis, this.yLimitMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMax);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}

		if (this.scene != undefined)
		{
			this.scene.addChangeListener(this);
		}
	}

	this.graphFunction = function(x, useCache)
	{
		if (useCache == undefined)
			useCache = this.useCache;

		if (this.yFunctionValues.length == 0)
			useCache = false;

		var evalStep = Math.max(this.evalStep, 0.01);

		var precalcMinX = this.xMin;
		var precalcMaxX = this.xMax;

		if (this.doConvolution)
		{
			precalcMinX = this.xMin + this.convolutionFunctionMinX;
			precalcMaxX = this.xMax + this.convolutionFunctionMaxX;
		}

		var result = 0;

		if (this.doConvolution)
		{
			var convolutionFunctionArea = 0;
			var evalStepLength = 0;

			// Run the convolution filter over the y values
			for (var dx = this.convolutionFunctionMinX; dx <= this.convolutionFunctionMaxX; dx += evalStep)
			{
				var xx = x + dx;
				
				if (this.coordinateType == 1)
				{
					if (xx<0)
					{
						xx += 2*Math.PI;
					}
					else if (xx>2*Math.PI)
					{
						xx -= 2*Math.PI;
					}
				}

				var weight = 0;

				if (useCache)
				{
					var index = Math.round((dx - this.convolutionFunctionMinX) / evalStep);
					weight = this.convolutionFunctionValues[index] * evalStep;
				}
				else
				{
					weight = this.convolutionFunction(dx) * evalStep;
				}

				evalStepLength += evalStep;
				convolutionFunctionArea += weight;
					
				if (useCache)
				{
					var index = Math.round((xx - precalcMinX) / evalStep);
					result += this.yFunctionValues[index] * weight;
				}
				else
				{
					var hitDistance = undefined;

					if (this.coordinateType == 0)
					{
						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, xx));

						var bestHit = this.scene.rayHitTest(p, this.yAxis);

						if (bestHit.hit)
						{
							hitDistance = bestHit.tRay;
						}
					}
					else
					{
						var bestHit = this.scene.rayHitTest(this.graphOrigin, fromAngle(xx));

						if (bestHit.hit)
						{
							hitDistance = bestHit.tRay;
						}
					}

					result += this.yFunction(xx, hitDistance, x) * weight;
				}
			}

			// Numerical integration normalization
			//result *= (this.xMax - this.xMin) / evalStepLength;
				
			if (convolutionFunctionArea>0)
			{
				// Normalized convolution factor (energy conservation)
				result *= 1 / convolutionFunctionArea; 
			}
		}
		else
		{
			if (useCache)
			{
				var index = Math.round((x - precalcMinX) / evalStep);

				if (index<0 || index>=this.yFunctionValues.length)
				{
					throw error;
				}

				result = this.yFunctionValues[index];
			}
			else
			{
				var hitDistance = undefined;

				if (this.coordinateType == 0)
				{
					var p = this.graphOrigin.copy();
					p = add(p, mul(this.xAxis, x));

					var bestHit = this.scene.rayHitTest(p, this.yAxis);

					if (bestHit.hit)
					{
						hitDistance = bestHit.tRay;
					}
				}
				else
				{
					var bestHit = this.scene.rayHitTest(this.graphOrigin, fromAngle(x));

					if (bestHit.hit)
					{
						hitDistance = bestHit.tRay;
					}
				}

				result = this.yFunction(x, hitDistance, x);
			}
		}

		return result;
	}

	this.onChangeCoords = function()
	{
		if (this.coordinateType == 0)
		{
			this.xMin = -5;
			this.xMax = 5;
			this.graphOriginLocal.x = 0;
			this.graphOriginLocal.y = 0;
			this.yLimitMin = -5;
			this.yLimitMax = 5;
			this.evalStep = 0.25;
			this.xLabelStep = 1;
		}
		else
		{
			this.xMin = 0;
			this.xMax = Math.PI*2;
			this.graphOriginLocal.x = 0;
			this.graphOriginLocal.y = 0;
			this.yLimitMin = 0;
			//this.yLimitMax = 5;
			this.evalStep = 1 * Math.PI / 180;
			this.xLabelStep = 45 * Math.PI / 180;
		}

		this.onChange({refreshProperties:true});
	}
	
	this.autoFit = function()
	{
		// work out function bounds
		var computed_yMin = Number.MAX_VALUE;
		var computed_yMax = -Number.MAX_VALUE;

		var evalStep = Math.max(this.evalStep, 0.01);

		for (var x = this.xMin; x <= this.xMax; x += evalStep)
		{
			y = this.graphFunction(x);

			computed_yMin = Math.min(computed_yMin, y);
			computed_yMax = Math.max(computed_yMax, y);
		}

		var yLabelStep = Math.max(0.01, this.yLabelStep);

		if (this.coordinateType == 0)
		{
			this.yLimitMin = Math.floor(computed_yMin / yLabelStep) * yLabelStep;
			this.yLimitMax = Math.ceil(computed_yMax / yLabelStep) * yLabelStep;
		}
		else
		{
			this.yLimitMax = Math.ceil(computed_yMax / yLabelStep) * yLabelStep;
		}
	}

	this.accumulationTimer = 0;
	this.onFrameTick = function(deltaTime_ms)
	{
		this.accumulationTimer += deltaTime_ms;

		if (this.accumulationTimer > 30)
		{
			this.accumulationTimer -= 30;
			return this.evaluateOnMouseCursor;
		}

		return false;
	}

	this.draw = function(camera, mousePos)
	{
		var evalStep = Math.max(this.evalStep, 0.01);
		var xLabelStep = Math.max(0.001, this.xLabelStep) * Math.ceil(camera.invScale(20) / Math.max(0.001, this.xLabelStep));

		//var xLabelStep = Math.max(0.001, this.xLabelStep);

		////xLabelStep *= Math.ceil(camera.invScale(20) / this.xLabelStep);
		////xLabelStep *= Math.ceil(xLabelWidth / this.xLabelStep);

		//{
		//	var xLabelWidth = Math.max(camera.measureText(this.xMin.toFixed(this.xLabelDecimals).toString()).x, camera.measureText(this.xMax.toFixed(this.xLabelDecimals).toString()).x);

		//	var minSpacing = xLabelWidth + camera.invScale(10);
		//	var maxSpacing = minSpacing * 2;

		//	var log10 = Math.floor(Math.log10(Math.max(Math.abs(this.xMin), Math.abs(this.xMax))));
		//	var pow10 = Math.pow(10, log10);

		//	var spacings = [1,2,5];
		//	var spacingIndex = 0;
		//	var searchDirection = 0;

		//	while (true)
		//	{
		//		xLabelStep = spacings[spacingIndex] * pow10;

		//		var xLabelCount = Math.floor((this.xMax - this.xMin) / xLabelStep)+1;
		//		var spacing = (this.xMax - this.xMin) / (xLabelCount-1);

		//		if (spacing < minSpacing && searchDirection >= 0)
		//		{
		//			searchDirection = 1;
		//			spacingIndex += 1;
		//			if (spacingIndex==spacings.length)
		//			{
		//				spacingIndex = 0;
		//				pow10 *= 10;
		//			}
		//		}
		//		else if (spacing > maxSpacing && searchDirection <= 0)
		//		{
		//			searchDirection = -1;
		//			spacingIndex -= 1;
		//			if (spacingIndex<0)
		//			{
		//				spacingIndex = spacings.length-1;
		//				pow10 /= 10;
		//			}
		//		}
		//		else
		//		{
		//			break;
		//		}
		//	}
		//}

		var yLabelStep = Math.max(0.001, this.yLabelStep) * Math.ceil(camera.invScale(20) / Math.max(0.001, this.yLabelStep));

		if (this.coordinateType == 1)
		{
			xLabelStep = Math.max(5, this.xLabelStep * 180/Math.PI) * Math.PI/180;
		}

		// Axes
		if (this.coordinateType == 0)
		{
			if (this.showXAxis)
			{
				camera.drawArrow(	add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMin)), 
									add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMax)), 
									15, "#000000", this.selected ? 2 : 1, [], this);
			}

			if (this.showYAxis)
			{
				camera.drawArrow(	add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin)), 
									add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax)), 
									15, "#000000", this.selected ? 2 : 1, [], this);
			}

			if (this.showXAxis && this.xGridlines)
			{
				var points = [];

				for (var y = this.graphOriginLocal.y; y >= this.yLimitMin; y -= yLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMin), mul(this.yAxis, this.graphOriginLocal.y + y));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMax), mul(this.yAxis, this.graphOriginLocal.y + y));

					points.push(p0);
					points.push(p1);
				}

				for (var y = this.graphOriginLocal.y; y <= this.yLimitMax; y += yLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMin), mul(this.yAxis, this.graphOriginLocal.y + y));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMax), mul(this.yAxis, this.graphOriginLocal.y + y));

					points.push(p0);
					points.push(p1);
				}

				camera.drawLines(points, "#000000", 1);
			}

			if (this.showYAxis && this.yGridlines)
			{
				var points = [];

				for (var x = this.graphOriginLocal.x; x >= this.xMin; x -= xLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax));

					points.push(p0);
					points.push(p1);
				}

				for (var x = this.graphOriginLocal.x; x <= this.xMax; x += xLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax));

					points.push(p0);
					points.push(p1);
				}

				camera.drawLines(points, "#000000", 1);
			}
		}
		else
		{
			if (this.showXAxis)
			{
				for (var a=0; a<Math.PI; a += xLabelStep)
				{
					var dir = mul( fromAngle(a), this.yLimitMax );

					camera.drawLine(	sub(this.origin, add( mul(this.xAxis, dir.x), mul(this.yAxis, dir.y) )),
										add(this.origin, add( mul(this.xAxis, dir.x), mul(this.yAxis, dir.y) )),
										"#000000", this.selected ? 2 : 1, [], this);
				}
			}

			if (this.showYAxis && this.yGridlines)
			{
				for (var y = yLabelStep; y <= this.yLimitMax; y += yLabelStep)
				{
					camera.drawArc(this.origin, y, 0, Math.PI*2, "#000000", 1);
				}
			}
		}

		// Axis labels
		{
			var points = [];

			// x axis
			if (this.coordinateType == 0 && this.xLabel != 2 && this.showXAxis)
			{
				var tan = mul(this.yAxis, camera.invScale(this.xLabel<1 ? -10 : 10));
				var textOffset = this.xLabel<1 ? 2.5 : 1.5;

				for (var x = -this.graphOriginLocal.x; x >= this.xMin; x -= xLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, 0));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, (this.xLabel==0 ? -1 : 1) * camera.invScale(10)));

					points.push(p0);
					points.push(p1);

					var textPoint = mad(tan, textOffset, p0);
					var value = x.toFixed(this.xLabelDecimals);
					camera.drawText(textPoint, value, "#000000", "center", 0);
				}

				for (var x = -this.graphOriginLocal.x; x <= this.xMax; x += xLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, 0));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, (this.xLabel==0 ? -1 : 1) * camera.invScale(10)));

					points.push(p0);
					points.push(p1);

					var textPoint = mad(tan, textOffset, p0);
					var value = x.toFixed(this.xLabelDecimals);
					camera.drawText(textPoint, value, "#000000", "center", 0);
				}
			}

			// y axis
			if (this.yLabel != 2 && this.showYAxis)
			{
				var tan = mul(this.xAxis, camera.invScale(this.yLabel<1 ? -10 : 10));
				var textOffset = this.yLabel<1 ? 2.5 : 1.5;

				for (var y = -this.graphOriginLocal.y; y >= this.yLimitMin; y -= yLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, 0), mul(this.yAxis, this.graphOriginLocal.y + y));
					var p1 = addv(this.origin, mul(this.xAxis, (this.yLabel==0 ? -1 : 1) * camera.invScale(10)), mul(this.yAxis, this.graphOriginLocal.y + y));

					points.push(p0);
					points.push(p1);

					var textPoint = mad(tan, textOffset, p0);
					var value = y.toFixed(this.yLabelDecimals);
					camera.drawText(textPoint, value, "#000000", "center", 0);
				}

				for (var y = -this.graphOriginLocal.y; y <= this.yLimitMax; y += yLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, 0), mul(this.yAxis, this.graphOriginLocal.y + y));
					var p1 = addv(this.origin, mul(this.xAxis, (this.yLabel==0 ? -1 : 1) * camera.invScale(10)), mul(this.yAxis, this.graphOriginLocal.y + y));

					points.push(p0);
					points.push(p1);

					var textPoint = mad(tan, textOffset, p0);
					var value = y.toFixed(this.yLabelDecimals);
					camera.drawText(textPoint, value, "#000000", "center", 0);
				}
			}

			camera.drawLines(points, "#000000", 1);
		}

		// Graph
		{
			// Note: We calculate the outline and the fill separately.
			//		 This is necessary when there is y clipping. We want the fill to
			//		 be clipped and show a straight line across the clip, but we don't
			//		 want the outline to show a straight line (because that would mean
			//		 the function is a straight line there).
			//
			//		 If no clipping occurs we can use the same calculation for both.

			var valuesClipped = false;
			var averageX = 0;
			var averageY = 0;

			if (this.appearance.NeedOutline() || this.appearance.fillAlpha>0)
			{
				var points = [];
				var previousX = 0;
				var previousY = 0;
				var previousOutside = false;

				var totalWeight = 0;

				for (var x = this.xMin; x <= this.xMax; x += evalStep)
				{
					var x = Math.min(this.xMax, x);
					var y = this.graphFunction(x);

					{
						var xCartesian = x;
						var yCartesian = y;

						if (this.coordinateType == 1)
						{
							var radial = mul(fromAngle(x), y);
							xCartesian = radial.x;
							yCartesian = radial.y;
						}

						averageX += xCartesian*1;
						averageY += yCartesian*1;
						totalWeight += 1;
					}

					// Check if we need to do any clipping
					var outside = y>this.yLimitMax || y<this.yLimitMin;

					valuesClipped |= outside;

					if (outside && previousOutside)
					{
						if (this.coordinateType == 1 && y>this.yLimitMax)
						{
							var radial = mul(fromAngle(x), this.yLimitMax);
							var xCartesian = radial.x;
							var yCartesian = radial.y;

							var p = this.graphOrigin.copy();
							p = add(p, mul(this.xAxis, xCartesian));
							p = add(p, mul(this.yAxis, yCartesian));
							points.push(p);
						}

						previousOutside = true;
						previousX = x;
						previousY = y;
					}
					else if (outside && !previousOutside)
					{
						var yClipped = clamp(y, this.yLimitMin, this.yLimitMax);
						var xClipped = x;

						if (points.length>0)
						{
							var t = abs(yClipped-previousY) / abs(y-previousY);
							var xClipped = lerp(previousX, x, t);
						}


						var xCartesian = xClipped;
						var yCartesian = yClipped;

						if (this.coordinateType == 1)
						{
							var radial = mul(fromAngle(xClipped), yClipped);
							xCartesian = radial.x;
							yCartesian = radial.y;
						}

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, xCartesian));
						p = add(p, mul(this.yAxis, yCartesian));

						points.push(p);

						previousOutside = true;
						previousX = x;
						previousY = y;
					}
					else if (!outside && previousOutside)
					{
						var yClipped = clamp(previousY, this.yLimitMin, this.yLimitMax);
						var t = abs(yClipped-previousY) / abs(y-previousY);
						var xClipped = lerp(previousX, x, t);

						var xCartesian = xClipped;
						var yCartesian = yClipped;

						if (this.coordinateType == 1)
						{
							var radial = mul(fromAngle(xClipped), yClipped);
							xCartesian = radial.x;
							yCartesian = radial.y;
						}

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, xCartesian));
						p = add(p, mul(this.yAxis, yCartesian));
						points.push(p);

						var xCartesian = x;
						var yCartesian = y;

						if (this.coordinateType == 1)
						{
							var radial = mul(fromAngle(x), y);
							xCartesian = radial.x;
							yCartesian = radial.y;
						}

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, xCartesian));
						p = add(p, mul(this.yAxis, yCartesian));
						points.push(p);

						previousOutside = false;
						previousX = x;
						previousY = y;
					}
					else if (!outside && !previousOutside)
					{
						var xCartesian = x;
						var yCartesian = y;

						if (this.coordinateType == 1)
						{
							var radial = mul(fromAngle(x), y);
							xCartesian = radial.x;
							yCartesian = radial.y;
						}

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, xCartesian));
						p = add(p, mul(this.yAxis, yCartesian));
						points.push(p);

						previousOutside = false;
						previousX = x;
						previousY = y;
					}

					// Vertical line to close the shape
					if (this.coordinateType == 0 && points.length == 1)
					{
						var o = this.graphOrigin.copy();
						o = add(o, mul(this.xAxis, previousX));
						o = add(o, mul(this.yAxis, clamp(0, this.yLimitMin, this.yLimitMax)));
						points.splice(0, 0, o);
					}
				}

				averageX /= totalWeight;
				averageY /= totalWeight;

				// Vertical line to close the shape
				if (this.coordinateType == 0 && points.length > 0)
				{
					if (previousOutside)
					{
						var yClipped = clamp(previousY, this.yLimitMin, this.yLimitMax);

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, previousX));
						p = add(p, mul(this.yAxis, yClipped));
						points.push(p);
					}

					var o = this.graphOrigin.copy();
					o = add(o, mul(this.xAxis, previousX));
					o = add(o, mul(this.yAxis, clamp(0, this.yLimitMin, this.yLimitMax)));
					points.push(o);
				}

				if (valuesClipped)
				{
					// Draw fill only
					camera.drawLineStrip(points, false, undefined, 0, [], this.appearance.GetFillColor());
				}
				else if (this.coordinateType == 0)
				{
					// Draw fill
					camera.drawLineStrip(points, false, undefined, 0, [], this.appearance.GetFillColor());

					// Draw outline excluding the first & last points (which are there to form vertical lines for the fill shape)
					camera.drawLineStrip(points.slice(1, points.length-1), false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), undefined, this);
				}
				else if (this.coordinateType == 1)
				{
					// Draw fill & outline
					camera.drawLineStrip(points, false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
				}
			}

			// Draw outline as line list (list rather than strip so that it can be discontinuous)
			if (this.appearance.NeedOutline() && valuesClipped)
			{
				var points = [];

				for (var x = this.xMin; x < this.xMax; x += evalStep)
				{
					var x0 = x;
					var x1 = Math.min(this.xMax, x + evalStep);

					var y0 = this.graphFunction(x0);
					var y1 = this.graphFunction(x1);

					// Check if we need to do any clipping
					var outside0 = y0>this.yLimitMax || y0<this.yLimitMin;
					var outside1 = y1>this.yLimitMax || y1<this.yLimitMin;

					if (outside0 && outside1)
					{
						continue;
					}

					var xCartesian0 = x0;
					var yCartesian0 = y0;
					var xCartesian1 = x1;
					var yCartesian1 = y1;

					if (this.coordinateType == 1)
					{
						var radial = mul(fromAngle(x0), y0);
						xCartesian0 = radial.x;
						yCartesian0 = radial.y;

						var radial = mul(fromAngle(x1), y1);
						xCartesian1 = radial.x;
						yCartesian1 = radial.y;
					}

					var p0 = this.graphOrigin.copy();
					p0 = add(p0, mul(this.xAxis, xCartesian0));
					p0 = add(p0, mul(this.yAxis, yCartesian0));

					var p1 = this.graphOrigin.copy();
					p1 = add(p1, mul(this.xAxis, xCartesian1));
					p1 = add(p1, mul(this.yAxis, yCartesian1));

					if (outside0)
					{
						var yc = clamp(y0, this.yLimitMin, this.yLimitMax);
						var t = abs(yc-y0) / abs(y1-y0);
						p0 = lerp(p0, p1, t);
					}
					else if (outside1)
					{
						var yc = clamp(y1, this.yLimitMin, this.yLimitMax);
						var t = abs(yc-y0) / abs(y1-y0);
						p1 = lerp(p0, p1, t);
					}

					points.push(p0);
					points.push(p1);
				}

				camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), undefined, this);
			}

			// Draw average XY
			if (this.showAverage)
			{
				if (this.coordinateType == 0)
				{
					var averageYclamp = clamp(averageY, this.yLimitMin, this.yLimitMax);

					if (averageX >= this.xMin && averageX <= this.xMax)
					{
						var pX = this.graphOrigin.copy();
						pX = add(pX, mul(this.xAxis, averageX));
						pX = add(pX, mul(this.yAxis, -this.graphOriginLocal.y));

						var pY = this.graphOrigin.copy();
						pY = add(pY, mul(this.yAxis, averageYclamp));
						pY = add(pY, mul(this.xAxis, -this.graphOriginLocal.x));

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, averageX));
						p = add(p, mul(this.yAxis, averageYclamp));

						camera.drawLine(pX, p, "#000000", 1, [5,5]);

						if (averageY == averageYclamp)
						{
							camera.drawLine(pY, p, "#000000", 1, [5,5]);
							camera.drawArc(p, camera.invScale(5), 0, Math.PI*2, "#008000", 4);
						}
					}
				}
				else
				{
					var radial = new Vector(averageX, averageY);

					var p = this.graphOrigin.copy();
					p = add(p, mul(this.xAxis, radial.x));
					p = add(p, mul(this.yAxis, radial.y));

					camera.drawArc(p, camera.invScale(3), 0, Math.PI*2, "#008000", 2);
				}
			}
		}

		if (this.evaluateOnMouseCursor)
		{
			if (this.coordinateType == 0)
			{
				var mouseX = dot(sub(mousePos, this.origin), this.xAxis) - this.graphOriginLocal.x;
				var mouseY = this.graphFunction(mouseX, false);
				var mouseYclamp = clamp(mouseY, this.yLimitMin, this.yLimitMax);

				if (mouseX >= this.xMin && mouseX <= this.xMax)
				{
					var pX = this.graphOrigin.copy();
					pX = add(pX, mul(this.xAxis, mouseX));
					pX = add(pX, mul(this.yAxis, -this.graphOriginLocal.y));

					var pY = this.graphOrigin.copy();
					pY = add(pY, mul(this.yAxis, mouseYclamp));
					pY = add(pY, mul(this.xAxis, -this.graphOriginLocal.x));

					var p = this.graphOrigin.copy();
					p = add(p, mul(this.xAxis, mouseX));
					p = add(p, mul(this.yAxis, mouseYclamp));

					camera.drawLine(pX, p, "#000000", 1, [5,5]);

					if (mouseY == mouseYclamp)
					{
						camera.drawLine(pY, p, "#000000", 1, [5,5]);
						camera.drawArc(p, camera.invScale(5), 0, Math.PI*2, "#008000", 4);
					}

					var p = p.copy();
					p.x += ((mouseX>0) ? +1 : -1) * camera.invScale(10);
					p.y += camera.invScale(10);

					camera.drawText(p, "x: " + mouseX.toFixed(this.xLabelDecimals+2) + ", y: " + mouseY.toFixed(this.yLabelDecimals+2), "#000000", mouseX>0 ? "left" : "right", 0, "12px Arial");
				}
			}
			else
			{
				var mouseX = toAngle(sub(mousePos, this.graphOrigin)) - toAngle(this.xAxis);

				if (mouseX<0)
					mouseX += Math.PI*2;

				var mouseY = this.graphFunction(mouseX, false);
				var mouseYclamp = clamp(mouseY, this.yLimitMin, this.yLimitMax);

				if (mouseY>0)
				{
					var radial = mul(fromAngle(mouseX), mouseYclamp);

					var p = this.graphOrigin.copy();
					p = add(p, mul(this.xAxis, radial.x));
					p = add(p, mul(this.yAxis, radial.y));

					if (mouseY == mouseYclamp)
					{
						//camera.drawArc(this.origin, Math.min(mouseY, camera.invScale(50)), 0, mouseX, "#000000", 1, undefined, [5,5]);
						camera.drawArc(p, camera.invScale(5), 0, Math.PI*2, "#008000", 4);
						camera.drawArrow(this.origin, p, 8, "#000000", 1, [5,5]);
					}
					else
					{
						camera.drawLine(this.origin, p, "#000000", 1, [5,5]);
					}

					var right = (mouseX <= Math.PI/2) || (mouseX >= Math.PI*3/2);
					var bottom = (mouseX >= Math.PI);

					p = add(p, mul(camera.invScale(10), sub(mousePos, this.graphOrigin).unit()));
					p.y -= bottom ? camera.invScale(15) : 0;

					camera.drawText(p, "θ: " + (mouseX * 180 / Math.PI).toFixed(1) + "°, y: " + mouseY.toFixed(this.yLabelDecimals+2), "#000000", right ? "left" : "right", 0, "12px Arial");
				}
			}
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		return camera.hitTest(a,b,this);
	}

	this.getSnapPoints = function ()
	{
		var points = [];

		points.push( { type: "node", p: this.origin} );

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.origin];

		if (this.coordinateType == 0)
		{
			points.push(add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMin - 0.01)));
			points.push(add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMax + 0.01)));
			points.push(add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin - 0.01)));
			points.push(add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax + 0.01)));

			if (!localSpace)
			{
				points.push(add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x + this.xMin), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin))  ));
				points.push(add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x + this.xMin), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax))  ));
				points.push(add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x + this.xMax), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax))  ));
				points.push(add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x + this.xMax), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin))  ));
			}
		}
		else
		{
			points.push(add(this.origin, mul(this.xAxis, this.graphOriginLocal.x - this.yLimitMax)));
			points.push(add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.yLimitMax)));
			points.push(add(this.origin, mul(this.yAxis, this.graphOriginLocal.y - this.yLimitMax)));
			points.push(add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax)));
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index == 1 || index == 2 || index == 3 || index == 4)
		{
			var axis = this.xAxis;

			if (index==1)
				axis = this.xAxis.neg();
			else if (index==2)
				axis = this.xAxis;
			else if (index==3)
				axis = this.yAxis.neg();
			else if (index==4)
				axis = this.yAxis;

			if (localSpace)
			{
				camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
			else
			{
				camera.drawArrow(position, add(position, mul(axis, camera.invScale(30))), 8, "rgba(255,0,0," + alpha + ")", 3);
			}
		}
		else
		{
			camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0)
		{
			if (!localSpace || this.coordinateType == 1)
			{
				this.origin = p;
			}
			else
			{
				p = clamp(p, this.boundsMin, this.boundsMax);

				var delta = sub(p, this.origin);

				var deltaX = dot(delta, this.xAxis);
				var deltaY = dot(delta, this.yAxis);

				this.graphOriginLocal.x -= deltaX;
				this.graphOriginLocal.y -= deltaY;

				this.origin = p;
			}
		}
		
		if (this.coordinateType == 0)
		{
			if (index == 1 || index == 5 || index == 6)
			{
				var limit = Math.min(-this.graphOriginLocal.x, this.xMax - (this.xMax - this.xMin) / 10);

				this.xMin = dot(sub(p, this.origin), this.xAxis) - this.graphOriginLocal.x;
				//this.xMin = dot(sub(p, this.graphOrigin), this.xAxis);
				this.xMin = Math.min(this.xMin, limit);
			}
		
			if (index == 2 || index == 7 || index == 8)
			{
				var limit = Math.max(-this.graphOriginLocal.x, this.xMin + (this.xMax - this.xMin) / 10);

				this.xMax = dot(sub(p, this.origin), this.xAxis) - this.graphOriginLocal.x;
				//this.xMax = dot(sub(p, this.graphOrigin), this.xAxis);
				this.xMax = Math.max(this.xMax, limit);
			}
		
			if (index == 3 || index == 5 || index == 8)
			{
				var limit = Math.min(-this.graphOriginLocal.y, this.yLimitMax - (this.yLimitMax - this.yLimitMin) / 10);

				this.yLimitMin = dot(sub(p, this.graphOrigin), this.yAxis);
				this.yLimitMin = Math.min(this.yLimitMin, limit);
			}
		
			if (index == 4 || index == 6 || index == 7)
			{
				var limit = Math.max(-this.graphOriginLocal.y, this.yLimitMin + (this.yLimitMax - this.yLimitMin) / 10);

				this.yLimitMax = dot(sub(p, this.graphOrigin), this.yAxis);
				this.yLimitMax = Math.max(this.yLimitMax, limit);
			}
		}
		else
		{
			var limit = 0.01;

			this.yLimitMax = sub(p, this.graphOrigin).length();
			this.yLimitMax = Math.max(this.yLimitMax, limit);
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.origin;
	}
	
	this.setOrigin = function(p)
	{
		this.origin = p;

		this.onChange();
	}

	this.getProperties = function()
	{
		var xAxis = new PopoutContainer(undefined, "images/distribute_horizontal.svg");
		{
			if (this.coordinateType == 0) 
			{
				xAxis.addControl("Eval Step", new Slider(0, 5, this.evalStep, 0.1, function (value) { this.evalStep = value; this.onChange(); }.bind(this)) );
			}
			else
			{
				xAxis.addControl("Eval Step", new Slider(0, 5, this.evalStep * 180 / Math.PI, 0.1, function (value) { this.evalStep = value * Math.PI/180; this.onChange(); }.bind(this)) );
			}

			xAxis.addControl("Show Axis", new TickBox(this.showXAxis, function (value) { this.showXAxis = value; this.onChange(); }.bind(this)) );

			if (this.coordinateType == 0) 
			{
				xAxis.addControl("Label", new Dropdown(["Below", "Above", "None"], this.xLabel, function (value) { this.xLabel = value; this.onChange(); }.bind(this)) );
			}

			if (this.coordinateType == 0)
			{
				xAxis.addControl("Label Step", new Slider(0.1, 5, this.xLabelStep, 0.1, function (value) { this.xLabelStep = value; this.onChange(); }.bind(this)) );
			}
			else
			{
				xAxis.addControl("Label Step", new Slider(5, 90, this.xLabelStep* 180/Math.PI, 5, function (value) { this.xLabelStep = value * Math.PI/180; this.onChange(); }.bind(this)) );
			}
			
			if (this.coordinateType == 0)
			{
				xAxis.addControl("Label Decimals", new Slider(0, 5, this.xLabelDecimals, 1, function (value) { this.xLabelDecimals = value; this.onChange(); }.bind(this)) );
			}

			xAxis.addControl("Grid Lines", new TickBox(this.xGridlines, function (value) { this.xGridlines = value; this.onChange(); }.bind(this)) );
		}

		var yAxis = new PopoutContainer(undefined, "images/distribute_horizontal.svg");
		{
			yAxis.addControl("Y Limits", new PlainButton("Auto Fit", function() { this.autoFit(); this.onChange(); }.bind(this)) );
			yAxis.addControl("Show Axis", new TickBox(this.showYAxis, function (value) { this.showYAxis = value; this.onChange(); }.bind(this)) );
			yAxis.addControl("Label", new Dropdown(["Left", "Right", "None"], this.yLabel, function (value) { this.yLabel = value; this.onChange(); }.bind(this)) );
			yAxis.addControl("Label Step", new Slider(0.1, 5, this.yLabelStep, 0.1, function (value) { this.yLabelStep = value; this.onChange(); }.bind(this)) );
			yAxis.addControl("Label Decimals", new Slider(0, 5, this.yLabelDecimals, 1, function (value) { this.yLabelDecimals = value; this.onChange(); }.bind(this)) );
			yAxis.addControl("Grid Lines", new TickBox(this.yGridlines, function (value) { this.yGridlines = value; this.onChange(); }.bind(this)) );
		}

		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Function", control: new PopoutTextBox(this.functionStr, "code", false, 0, function (value) { this.functionStr = value; this.yFunction = undefined; this.onChange(); }.bind(this)) },
					this.doConvolution ? {name: "Convolution Function", control: new PopoutTextBox(this.convolutionFunctionStr, "code", false, 0, function (value) { this.convolutionFunctionStr = value; this.convolutionFunction = undefined; this.onChange(); }.bind(this)) } : undefined,
					{name: "Coordinates", control: new Dropdown(["Cartesian", "Polar"], this.coordinateType, function (value) { this.coordinateType = value; this.onChangeCoords(); }.bind(this)) },
					{name: "X Axis", control: xAxis},
					{name: "Y Axis", control: yAxis},
					{name: "Show Mouse", control: new TickBox(this.evaluateOnMouseCursor, function (value) { this.evaluateOnMouseCursor = value; this.onChange(); }.bind(this)) },
					{name: "Show Average", control: new TickBox(this.showAverage, function (value) { this.showAverage = value; this.onChange(); }.bind(this)) },
					{name: "Convolution", control: new TickBox(this.doConvolution, function (value) { this.doConvolution = value; this.onChange({refreshProperties:true}); }.bind(this)) },
				];
	}

	this.toggleVisibility = function(v)
	{
		var newVisible = (v!==undefined) ? v : !this.visible;
		if (this.visible != newVisible)
		{
			this.visible = newVisible;
			this.onChange();
		}
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}
