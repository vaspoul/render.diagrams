// ----------------------------------------------------------------------------------------------------------------
// Parallel Light
// ----------------------------------------------------------------------------------------------------------------
function ParallelLight(O, dir)
{
	this.scene				= null;
	this.O					= O;
	this.dir				= dir;
	this.width				= 10;
	this.collisionOutline	= true;
	this.pixelCount			= 4;
	this.spanCount			= 1;
	this.spanDistances		= [];
	this.spanExpr			= "return spanIndex * 5;";
	this.spanDistanceFunc	= Function("spanIndex", this.spanExpr).bind(this);
	this.showZBuffer		= false;
	this.showCenterLines	= true;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= new Appearance("#FFC000", 1, 2);
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

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
		var str = "var light = new ParallelLight(";

		str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
		str += ", new Vector(" + this.dir.x + ", " + this.dir.y + ")";
		str += ");\n";

		str += "light.width = " + this.width + ";\n";
		str += "light.collisionOutline = " + this.collisionOutline + ";\n";
		str += "light.pixelCount = " + this.pixelCount + ";\n";
		str += "light.spanCount = " + this.spanCount + ";\n";
		str += "light.spanExpr = unescape(\"" + escape(this.spanExpr) + "\");\n";
		str += "light.showZBuffer = " + this.showZBuffer + ";\n";
		str += "light.showCenterLines = " + this.showCenterLines + ";\n";
		str += this.appearance.saveAsJavascript("light");
		str += "light.visible = " + this.visible + ";\n";
		str += "light.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(light);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this, false);

		this.spanDistanceFunc = Function("spanIndex", this.spanExpr).bind(this);

		this.spanDistances = [];

		if (this.spanCount>1)
		{
			for (var spanIndex=0; spanIndex <= this.spanCount; ++spanIndex)
			{
				this.spanDistances[spanIndex] = this.spanDistanceFunc(spanIndex);
			}
		}

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var tan = transpose(this.dir);

		var points = [];
		points.push(mad(tan, -this.width / 2, this.O));
		points.push(mad(tan, +this.width / 2, this.O));

		if (this.spanCount>1)
		{
			var farDist = this.spanDistances[this.spanDistances.length-1];

			points.push(mad(tan, -this.width / 2, mad(this.dir, farDist, this.O)));
			points.push(mad(tan, +this.width / 2, mad(this.dir, farDist, this.O)));
		}

		for (var i = 0; i != points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, points[i]);
			this.boundsMax = max(this.boundsMax, points[i]);
		}

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		var tan = transpose(this.dir);

		var farDist = this.spanCount>1 ? this.spanDistances[this.spanDistances.length-1] : 1000;

		if (this.collisionOutline)
		{
			var points = [];

			var stepCount = this.width / camera.invScale(20);
			var step = this.width / stepCount;

			var testDistances = [];

			// Add fixed steps
			for (var x=-this.width/2; x<this.width/2; x+=step)
			{
				testDistances.push(x);
			}

			testDistances.push(this.width/2);

			// Add steps at each snap point so that we don't miss any corners
			{
				var snapPoints = this.scene.getRayHitTestPoints();

				var delta = camera.invScale(0.5);

				for (var p=0; p<snapPoints.length; ++p)
				{
					var d = dot(sub(snapPoints[p], this.O), tan);
					
					if (Math.abs(d) > (this.width/2) )
						continue;

					// Add rays before/after to prevent lines from jumping around
					testDistances.push(d-delta);
					testDistances.push(d);
					testDistances.push(d+delta);
				}
			}

			testDistances.sort(function(a,b) { return a-b; });

			// Remove duplicates; https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
			testDistances = [...new Set(testDistances)];

			points.push(mad(tan, -this.width / 2, this.O));

			for (var i=0; i!=testDistances.length; ++i)
			{
				var x = testDistances[i];

				var point = mad(tan, x, this.O);
				var pointFar = mad(this.dir, farDist, point);

				var hit = this.scene.rayHitTest(point, this.dir);

				if (hit.hit)
				{
					points.push(mad(this.dir, Math.min(farDist, hit.tRay), point));
				}
				else
				{
					points.push(pointFar);
				}
			}

			points.push(mad(tan, this.width / 2, this.O));

			camera.drawLineStrip(points, false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
		}

		camera.drawLine(mad(tan, this.width/2, this.O), mad(tan, -this.width/2, this.O), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));

		if (this.spanCount>1)
		{
			for (var i=1; i<=this.spanCount; ++i)
			{
				var p = mad(this.dir, this.spanDistances[i], this.O);
				camera.drawLine(mad(tan, this.width/2, p), mad(tan, -this.width/2, p), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
			}
		}

		if (this.pixelCount > 0)
		{
			var step = this.width / this.pixelCount / 2;

			for (var c=0, x=-this.width/2; c<=this.pixelCount*2; ++c, x+=step)
			{
				var pointNear = mad(tan, x, this.O);
				var pointFar = mad(this.dir, farDist, pointNear);

				if (this.collisionOutline)
				{
					var bestHit = this.scene.rayHitTest(pointNear, this.dir);

					if (bestHit.hit && bestHit.tRay < farDist)
					{
						pointFar = bestHit.P;
					}
				}

				if (c % 2)
				{
					if (this.showCenterLines)
					{
						camera.drawLine(pointNear, pointFar, "rgba(0,0,0,0.2)", this.appearance.GetLineWidth(this.selected), [10, 5, 2, 5], this);
					}

					if (this.showZBuffer)
					{
						var bestHit = this.scene.rayHitTest(pointNear, this.dir);

						if (bestHit.hit && bestHit.tRay <= farDist)
						{
							var result0 = mad(tan, step, bestHit.P);
							var result1 = mad(tan, -step, bestHit.P);

							camera.drawLine(result0, result1, "#FF0000", this.appearance.GetLineWidth(this.selected), [], this);
						}
					}
				}
				else
				{
					camera.drawLine(pointNear, pointFar, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
				}
			}
		}

		// Draw arrows
		{
			var spacing = camera.invScale(30);
			var stepCount = 2 * Math.floor(this.width / 2 / spacing) + 1;
			var step = this.width / stepCount;

			for (var x=0; x<=stepCount; ++x)
			{
				var p0 = mad(tan, x*step - this.width / 2, mad(this.dir, -camera.invScale(40), this.O));
				var p1 = mad(tan, x*step - this.width / 2, this.O);
				camera.drawArrow(p0, p1, 20, this.appearance.GetLineColor(), 2);
			}

			//camera.drawArrow(this.O, mad(this.dir, 3, this.O), 20, this.appearance.GetLineColor(), 2);
		}

		camera.drawStar(this.O, 7, 0.5, 0.5, 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,0.8)");
	}
	
	this.hitTest = function(a, b, camera)
	{
		var p = min(max(this.O, a), b);

		var d = sub(p, this.O).length();

		return (d<=0.5);
	}
	
	this.getSnapPoints = function()
	{
		var tan = transpose(this.dir);

		var points = [	{ type: "node", p: this.O},
						{ type: "node", p: mad(tan, -this.width / 2, this.O) },
						{ type: "node", p: mad(tan, +this.width / 2, this.O) },
					];

		if (this.spanCount>1)
		{
			for (var i=1; i!=this.spanCount; ++i)
			{
				var p = mad(this.dir, this.spanDistances[i], this.O);

				points.push({ type: "node", p: mad(tan, this.width/2, p)});
				points.push({ type: "node", p: mad(tan, -this.width/2, p)});
			}
		}

		if (this.pixelCount > 0)
		{
			var step = this.width / this.pixelCount / 2;
			
			for (var c=0, x=-this.width/2; c<=this.pixelCount*2; ++c, x+=step)
			{
				var pointNear = mad(tan, x, this.O);

				points.push({ type: "node", p: pointNear});
			}
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [];

		var tan = transpose(this.dir);

		points.push(this.O);
		points.push(mad(this.dir, 3, this.O));
		points.push(mad(tan, +this.width/2, this.O));
		points.push(mad(tan, -this.width/2, this.O));

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var tan = transpose(this.dir);

		if (index == 0)
		{
			camera.drawRectangle(this.O, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else if (index==1)
		{
			camera.drawArc(this.O, 3, toAngle(this.dir) - Math.PI/6, toAngle(this.dir) + Math.PI/6, "rgba(255,0,0," + alpha + ")", 2);
			camera.drawRectangle(add(this.O, mul(this.dir, 3)), camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else if (index==2)
		{
			if (localSpace)
			{
				var a = add(this.O, mul(tan, this.width/2));
				var b = mad(tan, camera.invScale(30), a);
				camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
			}
			else
			{
				camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
		}
		else if (index==3)
		{
			if (localSpace)
			{
				var a = add(this.O, mul(tan, -this.width/2));
				var b = mad(tan.neg(), camera.invScale(30), a);
				camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
			}
			else
			{
				camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index==0)
		{
			this.O = p;
		}
		else if (index==1)
		{
			this.dir = sub(p, this.O).unit();
		}
		else if (index==2 || index==3)
		{
			if (localSpace)
			{
				this.width = sub(p, this.O).length()*2;
			}
			else if (index==2)
			{
				var tan = transpose(this.dir);

				var otherP = mad(tan, -this.width/2, this.O);
				this.O = avg(otherP, p);
				this.dir = transpose(sub(otherP, p).unit());
				this.width = distance(p, otherP);
			}
			else if (index==3)
			{
				var tan = transpose(this.dir);

				var otherP = mad(tan, +this.width/2, this.O);
				this.O = avg(otherP, p);
				this.dir = transpose(sub(p, otherP).unit());
				this.width = distance(p, otherP);
			}
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.O;
	}
	
	this.setOrigin = function(p)
	{
		this.O = p;

		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "Collision Outline", control: new TickBox(this.collisionOutline, function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) },
					{ name: "Pixel Count", control: new PopoutSlider(0, 20, this.pixelCount, 1, function (value) { this.pixelCount = value; this.onChange(); }.bind(this)) },
					{ name: "Show Center Lines", control: new TickBox(this.showCenterLines, function (value) { this.showCenterLines = value; this.onChange(); }.bind(this)) },
					{ name: "Show Z Buffer", control: new TickBox(this.showZBuffer, function (value) { this.showZBuffer = value; this.onChange(); }.bind(this)) },
					{ name: "Span Count", control: new PopoutSlider(0, 10, this.spanCount, 1, function (value) { this.spanCount = value; this.onChange(); }.bind(this)) },
					{ name: "Span Spacing", control: new PopoutTextBox(this.spanExpr, "code", false, 0, function (value) { this.spanExpr = value; this.onChange(); }.bind(this)) },
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
