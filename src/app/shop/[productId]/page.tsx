import ProductDetail from "@/components/ShopProductDetail";

export default async function ShopProductPage({ params }: PageProps<"/shop/[productId]">) {
  const { productId } = await params;
  return <ProductDetail productId={productId} />;
}
