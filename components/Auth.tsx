import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/router";
import { useState } from "react";

export const AUTH_KEY = "AUTH_TOKEN";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const Auth = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sign-in", {
        method: "POST",
        body: JSON.stringify(values),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!data.token) {
        throw Error("No token");
      } else {
        localStorage.setItem(AUTH_KEY, data.token);
        toast({
          title: "Sign In Successful!",
        });
        router.reload();
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Could Not Sign In",
        description: "Make sure you're using the correct email and password.",
      });
    }
    setIsLoading(false);
  };

  return (
    <div>
      <div className="bg-white rounded-xl max-w-md mx-auto p-5 m-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="myemail@email.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                Sign In
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default Auth;
