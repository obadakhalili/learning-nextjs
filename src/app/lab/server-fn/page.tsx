import Greeter from "./_components/greeter";
import PostForm from "./_components/post-form";

export default function ServerFnPage() {
  return (
    <article className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Server Functions demo</h1>
        <p className="text-sm text-slate-700">
          Type a name and click Greet. The response is generated on the server —
          notice the PID and timestamp come from Node.js. Watch the POST in the
          Network tab.
        </p>
        <Greeter />
      </section>

      <hr className="border-slate-200" />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Server Action + form demo</h2>
        <p className="text-sm text-slate-700">
          Form uses <code>useActionState</code> (return value + pending) and{" "}
          <code>useFormStatus</code> (pending inside the form). 1s fake delay so
          pending state is clearly visible. Try submitting empty to see
          server-side validation errors.
        </p>
        <PostForm />
      </section>
    </article>
  );
}
