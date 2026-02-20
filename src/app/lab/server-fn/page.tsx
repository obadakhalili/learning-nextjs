import Greeter from "./_components/greeter";

export default function ServerFnPage() {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-semibold">Server Functions demo</h1>
      <p className="text-sm text-slate-700">
        Type a name and click Greet. The response is generated on the server — notice the PID and timestamp come from Node.js.
      </p>
      <p className="text-sm text-slate-700">
        Open the Network tab and watch the POST request fire when you click.
      </p>
      <Greeter />
    </article>
  );
}
