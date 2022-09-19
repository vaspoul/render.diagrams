// ----------------------------------------------------------------------------------------------------------------
// DiffractionGrating
// ----------------------------------------------------------------------------------------------------------------
function DiffractionGrating(firstPoint)
{
	this.scene				= null;
	this.p0					= firstPoint;
	this.p1					= firstPoint;
	this.linesPerMM			= 1000;
	this.showDebugPoint		= true;
	this.showCameraLines	= true;
	this.restrictToCamFOV	= false;
	this.debugPointT		= 0.5;
	this.spacing			= 0.5;
	this.appearance			= new Appearance("#000000", 1, 2);
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
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
		var str = "var diffractionGrating = new DiffractionGrating(";
		str += "new Vector(" + this.p0.x  + ", " + this.p0.y + ")";
		str += ");\n";

		str += "diffractionGrating.p0 = new Vector(" + this.p0.x  + ", " + this.p0.y + ");\n";
		str += "diffractionGrating.p1 = new Vector(" + this.p1.x  + ", " + this.p1.y + ");\n";
		str += "diffractionGrating.showDebugPoint = " + this.showDebugPoint + ";\n";
		str += "diffractionGrating.showCameraLines = " + this.showCameraLines + ";\n";
		str += "diffractionGrating.restrictToCamFOV = " + this.restrictToCamFOV + ";\n";
		str += "diffractionGrating.debugPointT = " + this.debugPointT + ";\n";
		str += "diffractionGrating.spacing = " + this.spacing + ";\n";

		str += this.appearance.saveAsJavascript("diffractionGrating");
		str += "diffractionGrating.visible = " + this.visible + ";\n";
		str += "diffractionGrating.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(diffractionGrating);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.boundsMin = this.p0;
		this.boundsMax = this.p1;

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		camera.drawLine(this.p0, this.p1, "#000000", this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash());

		if (this.scene)
		{
			var lightObject = undefined;
			var cameraObject = undefined;

			for (var i in this.scene.objects)
			{
				if (this.scene.objects[i] instanceof PointLight || this.scene.objects[i] instanceof SpotLight || this.scene.objects[i] instanceof ParallelLight)
				{
					if (this.scene.objects[i].isVisible())
						lightObject = this.scene.objects[i];
				}
				else if (this.scene.objects[i] instanceof CameraObject)
				{
					if (this.scene.objects[i].isVisible())
						cameraObject = this.scene.objects[i];
				}

				if (lightObject != undefined && cameraObject != undefined)
					break;
			}

			var count = Math.ceil( distance(this.p0, this.p1) / this.spacing );
			var delta = distance(this.p0, this.p1) / count;
			var gratingDir = normalize(sub(this.p1, this.p0));
			var gratingNormal = transpose(gratingDir).neg();

			if (lightObject != undefined)
			{
				if (this.showCameraLines && cameraObject != undefined)
				{
					for (var i=0; i <= count; ++i)
					{
						var p = mad(gratingDir, i * delta, this.p0);

						var entryDir;
						
						if (lightObject instanceof PointLight)
							entryDir = normalize(sub(lightObject.center, p));
						else if (lightObject instanceof SpotLight)
							entryDir = normalize(sub(lightObject.O, p));
						else
							entryDir = lightObject.dir;

						if (lightObject instanceof SpotLight)
							if (dot(entryDir.neg(), sub(lightObject.target, lightObject.O).unit()) < Math.cos(toRadians(lightObject.fovDegrees/2)))
								continue;

						if (lightObject instanceof ParallelLight)
						{
							var lightTan = transpose(lightObject.dir);

							if (abs(dot(sub(p, lightObject.O), lightTan)) > lightObject.width/2)
								continue;
						}

						var sinEntry = cross(entryDir, gratingNormal);

						if (lightObject instanceof PointLight)
							camera.drawLine( p, lightObject.center, lightObject.appearance.GetLineColor());
						else if (lightObject instanceof SpotLight)
							camera.drawLine( p, lightObject.O, lightObject.appearance.GetLineColor());
						else
							camera.drawLine( p, mad(lightObject.dir.neg(), -dot(sub(lightObject.O, p), lightObject.dir), p), lightObject.appearance.GetLineColor());

						var cameraFOVcosine = Math.cos(toRadians(cameraObject.fovDegrees/2));

						var pCamDir = normalize(sub(cameraObject.apexPoint, p));

						if (dot(pCamDir.neg(), cameraObject.dir) < cameraFOVcosine && this.restrictToCamFOV)
							continue;

						var sinExit = cross(pCamDir, gratingNormal);

						for (var band=-2; band<=2; ++band)
						{
							if (band == 0)
								continue;

							// sin(theta_out) = sin(theta_in) - m * wavelength * linesPerMM * 10^-6
							// wavelength = (sin(theta_in) - sin(theta_out)) / ( m * linesPerMM * 10^-6 );

							var wavelength = (sinEntry - sinExit) / (band * this.linesPerMM * 1e-6);

							if (wavelength >= 380 && wavelength <= 680)
							{
								camera.drawLine( p, cameraObject.apexPoint, wavelengthToColor(wavelength)[3], 4, abs(band)>1 ? [5,5] : undefined);
								camera.drawText( mad( pCamDir, camera.invScale(13), p), wavelength.toFixed(0).toString() + (abs(band)>1 ? " (" + band.toFixed(0).toString() + ")" : ""), "#000000", undefined, toAngle(pCamDir), "8px");
							}
						}
					}
				}

				if (this.showDebugPoint)
				{
					var debugPoint = mad(sub(this.p1, this.p0), this.debugPointT, this.p0);

					if (lightObject instanceof PointLight)
						camera.drawLine( debugPoint, lightObject.center, lightObject.appearance.GetLineColor());
					else if (lightObject instanceof SpotLight)
						camera.drawLine( debugPoint, lightObject.O, lightObject.appearance.GetLineColor());
					else
						camera.drawLine( debugPoint, mad(lightObject.dir.neg(), -dot(sub(lightObject.O, debugPoint), lightObject.dir), debugPoint), lightObject.appearance.GetLineColor());

					camera.drawArc( debugPoint, camera.invScale(3), 0, toRadians(360), "#000000", 1, "#000000");

					var entryDir;
						
					if (lightObject instanceof PointLight)
						entryDir = normalize(sub(lightObject.center, debugPoint));
					else if (lightObject instanceof SpotLight)
						entryDir = normalize(sub(lightObject.O, debugPoint));
					else
						entryDir = lightObject.dir;

					var sinEntry = cross(entryDir, gratingNormal);

					for (var band=-1; band<=1; ++band)
					{
						if (band == 0)
							continue;

						for (var wavelength=380; wavelength <= 680; wavelength += 10)
						{
							var sinExit = sinEntry - band * wavelength * this.linesPerMM * 1e-6;

							if (sinExit <-1 || sinExit > 1)
								continue;

							var cosExit = Math.sqrt(1 - sinExit * sinExit);

							var p2 = mad(gratingNormal, cosExit, mad(gratingDir, sinExit, debugPoint));
							camera.drawLine( debugPoint, p2, wavelengthToColor(wavelength)[3], 4);
						}

						// line to camera
						if (this.showCameraLines && cameraObject != undefined)
						{
							var pCamDir = normalize(sub(cameraObject.apexPoint, debugPoint));

							var cameraFOVcosine = Math.cos(toRadians(cameraObject.fovDegrees/2));

							if (lightObject instanceof SpotLight)
								if (dot(entryDir.neg(), sub(lightObject.target, lightObject.O).unit()) < Math.cos(toRadians(lightObject.fovDegrees/2)))
									continue;

							if (!this.restrictToCamFOV || dot(pCamDir.neg(), cameraObject.dir) >= cameraFOVcosine)
							{
								var sinExit = cross(pCamDir, gratingNormal);

								var wavelength = (sinEntry - sinExit) / (band * this.linesPerMM * 1e-6);

								if (wavelength >= 380 && wavelength <= 680)
								{
									camera.drawLine( debugPoint, cameraObject.apexPoint, wavelengthToColor(wavelength)[3], 4, abs(band)>1 ? [5,5] : undefined);
									camera.drawText( mad( pCamDir, camera.invScale(13), debugPoint), wavelength.toFixed(0).toString() + (abs(band)>1 ? " (" + band.toFixed(0).toString() + ")" : ""), "#000000", undefined, toAngle(pCamDir), "8px");
								}
							}
						}
					}
				}
			}
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (overlapRectLine(a, b, this.p0, this.p1))
		{
			return true;
		}

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "node", p: this.p0 }, { type: "node", p: this.p1 } ];

		if (this.showDebugPoint)
			points.push( { type: "node", p: mad(sub(this.p1, this.p0), this.debugPointT, this.p0) } );

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [ this.p0, this.p1 ];

		if (this.showDebugPoint)
			points.push( mad(sub(this.p1, this.p0), this.debugPointT, this.p0) );

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var points = this.getDragPoints(localSpace, camera);

		camera.drawRectangle(points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		var oldDebugPoint = mad(sub(this.p1, this.p0), this.debugPointT, this.p0);

		if (index == 0)
		{
			this.p0 = p;

			this.debugPointT = saturate( dot( sub(oldDebugPoint, this.p0), sub(this.p1, this.p0) ) / distanceSqr(this.p0, this.p1) );
		}
		else if (index == 1)
		{
			this.p1 = p;

			this.debugPointT = saturate( dot( sub(oldDebugPoint, this.p0), sub(this.p1, this.p0) ) / distanceSqr(this.p0, this.p1) );
		}
		else if (index == 2)
		{
			this.debugPointT = saturate( dot( sub(p, this.p0), sub(this.p1, this.p0) ) / distanceSqr(this.p0, this.p1) );
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.p0;
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(this.p1, this.p0);

		this.p0 = p;
		this.p1 = add(this.p0, delta);

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{name: "Lines Per mm", control: new PopoutSlider(100, 1500, this.linesPerMM, 100, function (value) { this.linesPerMM = value; this.onChange(); }.bind(this)) },
					{name: "Show Debug Point", control: new TickBox(this.showDebugPoint, function (value) { this.showDebugPoint = value; this.onChange(); }.bind(this)) },
					{name: "Show Camera Lines", control: new TickBox(this.showCameraLines, function (value) { this.showCameraLines = value; this.onChange(); }.bind(this)) },
					{name: "Restrict to Camera FOV", control: new TickBox(this.restrictToCamFOV, function (value) { this.restrictToCamFOV = value; this.onChange(); }.bind(this)) },
					{name: "Sample Spacing", control: new PopoutSlider(0.2, 2, this.spacing, 0.2, function (value) { this.spacing = value; this.onChange(); }.bind(this)) },
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
}
