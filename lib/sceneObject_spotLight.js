// ----------------------------------------------------------------------------------------------------------------
// Spot Light
// ----------------------------------------------------------------------------------------------------------------
function SpotLight(O, target, fovDegrees)
{
	Frustum.call(this);

	this.O					= O;
	this.target				= target;
	this.fovDegrees			= fovDegrees;
	this.nearZ				= 0.1;
	this.appearance			= new Appearance("#FFC000", 1, 2);
	this.pixelCount			= 0;
	this.spanCount			= 1;
	this.collisionOutline	= true;

	this.saveAsJavascript = function()
	{
		var str = "var light = new SpotLight( new Vector(" + this.O.x + ", " + this.O.y + "), new Vector(" + this.target.x + ", " + this.target.y + "), " + this.fovDegrees + ");\n";

		str = this.saveAsJavascriptBase("light", str);

		return str;
	}

	this.drawBase = this.draw;

	this.draw = function(camera)
	{
		this.drawBase(camera);

		camera.drawStar(this.O, 7, 0.5, 0.5, 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,0.8)");
	}

	this.onChange();
}
