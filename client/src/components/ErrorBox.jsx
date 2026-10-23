import Banner from "./Banner";

export default function ErrorBox({ message }) {
  return <Banner message={message} variant="error" />;
}
