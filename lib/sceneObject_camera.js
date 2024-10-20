// ----------------------------------------------------------------------------------------------------------------
// CameraObject
// ----------------------------------------------------------------------------------------------------------------
function CameraObject(O, target, fovDegrees)
{
	Frustum.call(this);

	this.O					= O;
	this.target				= target;
	this.fovDegrees			= fovDegrees;
	this.appearance			= new Appearance("#39F4FF", 1, 2);

	this.saveAsJavascript = function()
	{
		var str = "var cam = new CameraObject();\n";

		this.saveAsJavascriptBase("cam", str);

		return str;
	}

	this.drawBase = this.draw;

	this.draw = function(camera)
	{
		this.drawBase(camera);

		// Eye
		{
			//camera.drawCross(this.apexPoint, camera.invScale(10), 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawLine(this.O, mad(fromAngle(toAngle(this.dir) + 30 * Math.PI / 180), camera.invScale(50), this.O), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawLine(this.O, mad(fromAngle(toAngle(this.dir) + -30 * Math.PI / 180), camera.invScale(50), this.O), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawArc(mad(this.dir, camera.invScale(30), this.O), camera.invScale(6), toAngle(this.dir) + 95 * Math.PI / 180, toAngle(this.dir) - 95 * Math.PI / 180, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(0,0,0,0.7)");
			camera.drawArc(this.O, camera.invScale(30), toAngle(this.dir) - 30 * Math.PI / 180, toAngle(this.dir) + 30 * Math.PI / 180, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
		}
	}

	this.onChange();
}
