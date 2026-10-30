export type ItemStatus = "available" | "reserved" | "sold";

export type PaymentMethod = "pix" | "card";

export type Item = {
  id: string;
  title: string;
  description: string;
  price: number;
  photos: string[];
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  itemId: string;
  itemTitle: string;
  buyerName: string;
  buyerContact: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
};

export type CreateItemInput = {
  title: string;
  description: string;
  price: number;
  photos: string[];
};

export type CreateOrderInput = {
  itemId: string;
  buyerName: string;
  buyerContact: string;
  paymentMethod: PaymentMethod;
};
