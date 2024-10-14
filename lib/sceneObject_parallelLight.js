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

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var points = [this.O, add(this.O, mul(this.dir, 3))];

		var tan = transpose(this.dir);

		points.push(add(this.O, mul(tan, this.width/2)));
		points.push(add(this.O, mul(tan, -this.width/2)));

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

		if (this.collisionOutline)
		{
			var points = [];

			var stepCount = this.width / camera.invScale(20);
			var step = this.width / stepCount;

			var testDistances = [];

			// Add fixed steps
			for (var x=-this.width/2; x<=this.width/2; x+=step)
			{
				testDistances.push(x);
			}

			// Add steps at each snap point so that we don't miss any corners
			{
				var snapPoints = this.scene.getRayHitTestPoints();

				for (var p=0; p<snapPoints.length; ++p)
				{
					var d = dot(sub(snapPoints[p], this.O), tan);
					
					if (Math.abs(d) > (this.width/2) )
						continue;

					testDistances.push(d);
				}
			}

			testDistances.sort(function(a,b) { return a-b; });

			points.push(add(this.O, mul(tan, -this.width / 2)));

			for (var i=0; i!=testDistances.length; ++i)
			{
				var x = testDistances[i];

				var point = add(this.O, mul(tan, x));

				var bestHit = {tRay:1000};
			
				var bestHit = this.scene.rayHitTest(point, this.dir);

				if (bestHit.tRay<1000)
				{
					points.push(bestHit.P);
				}
				else
				{
					points.push(add(point, mul(this.dir, 1000)));
				}
			}

			points.push(add(this.O, mul(tan, this.width / 2)));

			this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
			this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

			for (var i=0; i!=points.length; ++i)
			{
				this.boundsMin = min(this.boundsMin, points[i]);
				this.boundsMax = max(this.boundsMax, points[i]);
			}

			camera.drawLineStrip(points, points.length>1, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
		}
		else
		{
			camera.drawLine(add(this.O, mul(tan, this.width/2)), add(this.O, mul(tan, -this.width/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
		}

		// Draw arrows
		{
			var stepCount = Math.floor(this.width / 0.8);
			var step = this.width / stepCount;

			for (var x=0; x<=stepCount; ++x)
			{
				var point = add(this.O, mul(tan, x*step-this.width/2));

				if (x == stepCount/2)
					continue;

				camera.drawArrow(point, mad(this.dir, 2, point), 20, this.appearance.GetLineColor(), 2);
			}

			camera.drawArrow(this.O, mad(this.dir, 3, this.O), 20, this.appearance.GetLineColor(), 2);
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
		return [{ type: "node", p: this.O}];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.O, add(this.O, mul(this.dir, 3))];

		var tan = transpose(this.dir);

		points.push(add(this.O, mul(tan, this.width/2)));
		points.push(add(this.O, mul(tan, -this.width/2)));

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
			var a = add(this.O, mul(tan, this.width/2));
			var b = mad(tan, camera.invScale(30), a);
			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==3)
		{
			var a = add(this.O, mul(tan, -this.width/2));
			var b = mad(tan.neg(), camera.invScale(30), a);
			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
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
			this.width = sub(p, this.O).length()*2;
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
					{ name: "Collision Outline", control: new TickBox(this.collisionOutline, function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) }
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
