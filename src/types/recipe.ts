// 配方項目類型
export interface RecipeItem {
  materialList: string;        // Material List (例如 "23404")
  materialListDesc: string;    // Mat. List Desc (例如 "Paper bag 25kg with aluminium inside")
  requirementQuantity: number; // Requirement Quantity (例如 2.000)
  baseUnit: string;           // Base Unit of Measure (例如 "PC", "KG")
}

