// ----------------------------------------------------------------------------------------------------------------
// Point Light
// ----------------------------------------------------------------------------------------------------------------
function PointLight(O, radius)
{
	this.scene				= null;
	this.center				= O;
	this.bulbRadius			= 1;
	this.radius				= radius;
	this.collisionOutline	= true;
	this.pixelCount			= 0;
	this.showZBuffer		= false;
	this.showMinZBuffer		= false;
	this.showMaxZBuffer		= false;
	this.showBestFitPlanes	= false;
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
		var str = "var light = new PointLight(";

		str += "new Vector(" + this.center.x + ", " + this.center.y + ")";
		str += ", " + this.radius;
		str += ");\n";

		str += "light.bulbRadius = " + this.bulbRadius + ";\n";
		str += "light.collisionOutline = " + this.collisionOutline + ";\n";
		str += "light.pixelCount = " + this.pixelCount + ";\n";
		str += "light.showZBuffer = " + this.showZBuffer + ";\n";
		str += "light.showMinZBuffer = " + this.showMinZBuffer + ";\n";
		str += "light.showMaxZBuffer = " + this.showMaxZBuffer + ";\n";
		str += "light.showBestFitPlanes = " + this.showBestFitPlanes + ";\n";
		str += "light.showCenterLines = " + this.showCenterLines + ";\n";
		str += this.appearance.saveAsJavascript("light");
		str += "light.visible = " + this.visible + ";\n";
		str += "light.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(light);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.boundsMin = sub(this.center, new Vector(this.radius, this.radius));
		this.boundsMax = add(this.center, new Vector(this.radius, this.radius));

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		camera.drawStar(this.center, 7, this.bulbRadius, 0.5, 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,0.8)");
		camera.drawArc(this.center, this.bulbRadius*0.5, 0, Math.PI*2, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,1)");

		var minZValues = Array(this.pixelCount).fill(Number.MAX_VALUE);
		var maxZValues = Array(this.pixelCount).fill(0);
		var zPoints = Array(this.pixelCount);

		for (var i=0; i<this.pixelCount; ++i)
		{
			zPoints[i] = [];
		}

		if (this.collisionOutline || this.showMinZBuffer || this.showMaxZBuffer || this.showBestFitPlanes)
		{
			this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
			this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

			var points = [];

			var angleStep = camera.invScale(20) / (2 * Math.PI * this.radius) * 360 * Math.PI / 180;

			var pixelSize = Math.PI * 2 / this.pixelCount;

			var testAngles = [];

			// Add fixed steps
			for (var a=0; a<=Math.PI*2; a+=angleStep)
			{
				testAngles.push(a);
			}

			// Add steps at each snap point so that we don't miss any corners
			if (this.collisionOutline)
			{
				var snapPoints = this.scene.getRayHitTestPoints();

				for (var p=0; p<snapPoints.length; ++p)
				{
					var a = toAngle( sub(snapPoints[p], this.center) );

					// Add rays before/after to prevent lines from jumping around
					var aP = a - Math.PI * 0.00001;
					var aN = a - Math.PI * 0.00001;

					if (a<0)	a += Math.PI*2;
					if (aP<0)	aP += Math.PI*2;
					if (aN<0)	aN += Math.PI*2;

					// Add rays before/after to prevent lines from jumping around
					testAngles.push(aP);
					testAngles.push(a);
					testAngles.push(aN);
				}

				if (this.showMinZBuffer || this.showMaxZBuffer || this.showBestFitPlanes)
				{
					for (var i=0; i<this.pixelCount; ++i)
					{
						var angle = i * pixelSize;
						testAngles.push(angle);
					}
				}
			}

			testAngles.sort(function(a,b) { return a-b; });

			for (var i=0; i!=testAngles.length; ++i)
			{
				var a = testAngles[i];
				var dir = fromAngle(a);
				var pixelIndex = Math.floor(a / pixelSize);
				var pixelDir = fromAngle( (pixelIndex + 0.5) * pixelSize );
				var pixelTan = transpose(pixelDir);

				var bestHit = this.scene.rayHitTest(this.center, dir);

				if (bestHit.tRay<this.radius)
				{
					points.push(bestHit.P);

					var z = bestHit.tRay * dot(pixelDir, dir);
					var x = bestHit.tRay * dot(pixelTan, dir);

					minZValues[pixelIndex] = Math.min(minZValues[pixelIndex], z);
					maxZValues[pixelIndex] = Math.max(maxZValues[pixelIndex], z);
					zPoints[pixelIndex].push({x:x, z:z});
				}
				else
				{
					points.push(add(this.center, mul(dir, this.radius)));

					var z = this.radius * dot(pixelDir, dir);
					var x = this.radius * dot(pixelTan, dir);

					minZValues[pixelIndex] = Math.min(minZValues[pixelIndex], z);
					maxZValues[pixelIndex] = Math.max(maxZValues[pixelIndex], z);
					zPoints[pixelIndex].push({x:x, z:z});
				}

				this.boundsMin = min(this.boundsMin, points[points.length-1]);
				this.boundsMax = max(this.boundsMax, points[points.length-1]);
			}

			camera.drawArc(this.center, this.radius, 0, Math.PI * 2, this.appearance.GetLineColor(), 1, "rgba(0,0,0,0)", [5,5], undefined, undefined, this);

			if (points.length>1)
			{
				camera.drawLineStrip(points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), undefined, undefined, this);
			}
		}
		else
		{
			camera.drawArc(this.center, this.radius, 0, Math.PI * 2, this.appearance.GetLineColor(), 1, "rgba(0,0,0,0)", undefined, undefined, undefined, this);
		}
	
		if (this.pixelCount > 0)
		{
			var minPoints = [];
			var maxPoints = [];
			var planePoints = [];

			for (var i=0; i<this.pixelCount*2; ++i)
			{
				var pixelIndex = Math.floor(i/2);
				var angle = i * pixelSize * 0.5;
				var dir = fromAngle(angle);
				var tan = transpose(dir);

				var pointFar = mad(dir, this.radius, this.center);

				var bestHit = this.scene.rayHitTest(this.center, dir);

				if (bestHit.tRay<this.radius)
				{
					pointFar = bestHit.P.copy();
				}

				if (i % 2)
				{
					if (this.showCenterLines)
					{
						camera.drawLine(this.center, pointFar, "rgba(0,0,0,0.2)", this.appearance.GetLineWidth(this.selected), [10, 5, 2, 5], this);
					}

					if (this.showZBuffer)
					{
						if (bestHit.tRay<this.radius)
						{
							var p0 = mad(tan, Math.tan(pixelSize*0.5) * bestHit.tRay, bestHit.P);
							var p1 = mad(tan, -Math.tan(pixelSize*0.5) * bestHit.tRay, bestHit.P);

							camera.drawLine(p0, p1, "#FF0000", this.appearance.GetLineWidth(this.selected), [], this);
						}
					}

					if (this.showMinZBuffer)
					{
						var minZ = minZValues[pixelIndex];

						if (minZ < Number.MAX_VALUE)
						{
							var p = mad(minZ, dir, this.center);
							var p0 = mad(tan, Math.tan(pixelSize*0.5) * minZ, p);
							var p1 = mad(tan, -Math.tan(pixelSize*0.5) * minZ, p);

							minPoints.push(p0);
							minPoints.push(p1);
							//camera.drawLine(p0, p1, "#00FF00", this.appearance.GetLineWidth(this.selected), [], this);
						}
					}

					if (this.showMaxZBuffer)
					{
						var maxZ = maxZValues[pixelIndex];

						if (maxZ > 0)
						{
							var p = mad(maxZ, dir, this.center);
							var p0 = mad(tan, Math.tan(pixelSize*0.5) * maxZ, p);
							var p1 = mad(tan, -Math.tan(pixelSize*0.5) * maxZ, p);

							maxPoints.push(p0);
							maxPoints.push(p1);
							//camera.drawLine(p0, p1, "#0000FF", this.appearance.GetLineWidth(this.selected), [], this);
						}
						else
						{
							var p = mad(this.radius, dir, this.center);
							var p0 = mad(tan, Math.tan(pixelSize*0.5) * this.radius, p);
							var p1 = mad(tan, -Math.tan(pixelSize*0.5) * this.radius, p);

							maxPoints.push(p0);
							maxPoints.push(p1);
						}
					}

					if (this.showBestFitPlanes)
					{
						if (zPoints[pixelIndex].length)
						{
							// Line of best fit calculated in the local coordinate system (x = tan, y = dir)
							var sum_xz = 0;
							var sum_x = 0;
							var sum_z = 0;
							var sum_x2 = 0;
							var n = zPoints[pixelIndex].length;

							for (var j=0; j != zPoints[pixelIndex].length; ++j)
							{
								var x = zPoints[pixelIndex][j].x;
								var z = zPoints[pixelIndex][j].z;

								sum_x += x;
								sum_z += z;
								sum_xz += x * z;
								sum_x2 += x * x;
							}

							var bestFit_m = (n * sum_xz - sum_x * sum_z) / (n * sum_x2 - sum_x * sum_x);
							var bestFit_c = (sum_z - bestFit_m * sum_x) / n;

							// Push to max Z
							var maxZ = 0;
							var maxX = 1;
							for (var j=0; j != zPoints[pixelIndex].length; ++j)
							{
								var x = zPoints[pixelIndex][j].x;
								var z = zPoints[pixelIndex][j].z;
								var c = z - bestFit_m * x;

								if (c > bestFit_c)
								{
									maxX = x;
									maxZ = z;
								}

								bestFit_c = Math.max(bestFit_c, c);
							}

							var deltaX = Math.tan(pixelSize*0.5) * bestFit_c;
							var p = mad(bestFit_c, dir, this.center);

							var bestFit_dir = (new Vector(1, bestFit_m)).norm();
							var edgeDir0 = (new Vector(deltaX, bestFit_c)).norm();
							var edgeDir1 = (new Vector(-deltaX, bestFit_c)).norm();

							var intersection0 = intersectRayRay(new Vector(0,0), bestFit_dir, new Vector(0, -bestFit_c), edgeDir0, true);
							var intersection1 = intersectRayRay(new Vector(0,0), bestFit_dir, new Vector(0, -bestFit_c), edgeDir1, true);

							var p0 = mad(tan, intersection0.P.x, mad(dir, intersection0.P.y, p));
							var p1 = mad(tan, intersection1.P.x, mad(dir, intersection1.P.y, p));

							planePoints.push(p0);
							planePoints.push(p1);

						//	var maxP = mad(tan, maxX, mad(dir, maxZ, this.center));
						//	camera.drawRectangle(p, camera.invScale(10), this.appearance.GetLineColor(), 0, undefined, this.appearance.GetLineColor());
						//	camera.drawRectangle(maxP, camera.invScale(10), "#FF0000", 0, undefined, "#FF0000");
						}
						else
						{
							var p = mad(this.radius, dir, this.center);
							var p0 = mad(tan, Math.tan(pixelSize*0.5) * this.radius, p);
							var p1 = mad(tan, -Math.tan(pixelSize*0.5) * this.radius, p);

							planePoints.push(p0);
							planePoints.push(p1);
						}
					}
				}
				else
				{
					camera.drawLine(this.center, pointFar, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
				}
			}

			if (this.showMinZBuffer)
			{
				camera.drawLineStrip(minPoints, true, "#00FF00", this.appearance.GetLineWidth(this.selected), [5,5], undefined, this);
				camera.drawLines(minPoints, "#00FF00", this.appearance.GetLineWidth(this.selected), undefined, undefined, this);
			}

			if (this.showMaxZBuffer)
			{
				camera.drawLineStrip(maxPoints, true, "#0000FF", this.appearance.GetLineWidth(this.selected), [5,5], undefined, this);
				camera.drawLines(maxPoints, "#0000FF", this.appearance.GetLineWidth(this.selected), undefined, undefined, this);
			}

			if (this.showBestFitPlanes)
			{
				camera.drawLineStrip(planePoints, true, "#13A1F2", this.appearance.GetLineWidth(this.selected), [5,5], undefined, this);
				camera.drawLines(planePoints, "#13A1F2", this.appearance.GetLineWidth(this.selected), undefined, undefined, this);
			}
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		// Check bulb
		{
			var p = min(max(this.center, a), b);

			var d = sub(p, this.center).length();

			if (d<=this.bulbRadius)
				return true;
		}

		// Check outer radius
		var rectMin = min(a, b);
		var rectMax = max(a, b);
		var rectCenter = avg(a, b);

		if (	b.x>=this.center.x &&
				a.x<=this.center.x &&
				b.y>=this.center.y &&
				a.y<=this.center.y)
		{
			return true;
		}

		var p = add(this.center, mul(sub(rectCenter, this.center).unit(), this.radius));

		if (	p.x>rectMax.x ||
				p.x<rectMin.x ||
				p.y>rectMax.y ||
				p.y<rectMin.y)
		{
			return false;
		}

		return true;
	}
	
	this.getSnapPoints = function()
	{
		return [{ type: "node", p: this.center}];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.center];

		var angleStep = 5 * Math.PI / 180;

		for (var a=0; a<=Math.PI*2; a+=angleStep)
		{
			points.push(add(this.center, mul(fromAngle(a), this.radius)));
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index==0)
		{
			camera.drawRectangle(this.center, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var angleStep = 5 * Math.PI / 180;

			var p = add(this.center, mul(fromAngle((index - 1) * angleStep), this.radius));

			camera.drawRectangle(p, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index==0)
		{
			this.center = p;
		}
		else
		{
			this.radius = sub(p, this.center).length();
		}

		if (camera != undefined)
		{
			var textPoint = p.copy();
			textPoint.x += ((p.x < this.center.x) ? +1 : -1) * camera.invScale(10);
			textPoint.y += camera.invScale(10);

			camera.drawText(textPoint, "R: " + this.radius.toFixed(1), "#000000", (p.x < this.center.x) ? "left" : "right", 0, "12px Arial");
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.center;
	}
	
	this.setOrigin = function(p)
	{
		this.center = p;

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
					{ name: "Bulb Radius", control: new PopoutSlider(0, 5, this.bulbRadius, 0.1, function (value) { this.bulbRadius = value; this.onChange(); }.bind(this)) },
					{ name: "Outer Radius", control: new PopoutSlider(0, 100, this.radius, 1, function (value) { this.radius = value; this.onChange(); }.bind(this)) },
					{ name: "Collision Outline", control: new TickBox(this.collisionOutline, function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) },
					{ name: "Pixel Count", control: new PopoutSlider(3, 32, this.pixelCount, 1, function (value) { this.pixelCount = value; this.onChange(); }.bind(this)) },
					{ name: "Show Center Lines", control: new TickBox(this.showCenterLines, function (value) { this.showCenterLines = value; this.onChange(); }.bind(this)) },
					{ name: "Show Z Buffer", control: new TickBox(this.showZBuffer, function (value) { this.showZBuffer = value; this.onChange(); }.bind(this)) },
					{ name: "Show Min Z Buffer", control: new TickBox(this.showMinZBuffer, function (value) { this.showMinZBuffer = value; this.onChange(); }.bind(this)) },
					{ name: "Show Max Z Buffer", control: new TickBox(this.showMaxZBuffer, function (value) { this.showMaxZBuffer = value; this.onChange(); }.bind(this)) },
					{ name: "Show Best Fit Planes", control: new TickBox(this.showBestFitPlanes, function (value) { this.showBestFitPlanes = value; this.onChange(); }.bind(this)) },
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
