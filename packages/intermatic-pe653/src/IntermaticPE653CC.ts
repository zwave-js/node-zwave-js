import {
  CommandClass,
  ManufacturerProprietaryCC,
  CCAPI,
  ValueMetadata,
  ValueID,
} from "zwave-js";

const INTERMATIC_MANUFACTURER_ID = 0x0005;

export class IntermaticPE653CC extends ManufacturerProprietaryCC {
  public static readonly manufacturerId = INTERMATIC_MANUFACTURER_ID;
  public static readonly version = 1;

  public deserialize(data: Buffer): void {
    super.deserialize(data);

    if (data.length >= 13) {
      const waterTemp = data.readUInt8(12);
      this.persistWaterTemp(waterTemp);
    }
  }

  private persistWaterTemp(waterTemp: number): void {
    const valueId: ValueID = {
      commandClass: this.ccId,
      property: "waterTemperature",
    };

    const metadata: ValueMetadata = {
      label: "Water Temperature",
      unit: "°F",
      valueType: "number",
      min: 0,
      max: 100,
    };

    this.getValueDB()?.setMetadata(valueId, metadata);
    this.getValueDB()?.setValue(valueId, waterTemp);
  }
}

export class IntermaticPE653CCAPI extends CCAPI {
  public async getWaterTemperature(): Promise<number | undefined> {
    const valueId: ValueID = {
      commandClass: this.ccId,
      property: "waterTemperature",
    };

    return this.getValueDB()?.getValue(valueId);
  }
}

// Register this CC with Z-Wave JS
ManufacturerProprietaryCC.addImplementation(INTERMATIC_MANUFACTURER_ID, IntermaticPE653CC); 