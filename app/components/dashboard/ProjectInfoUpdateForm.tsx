'use client';

import { z } from 'zod/v3';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '../ui/Textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, RequiredFieldMark } from '../ui/Form';

import { useUpdateProjectInfoMutation, useProjectQuery } from 'query/use-project-query';

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().max(500, 'Description should be shorter than 500 characters').optional(),
});

interface ProjectInfoUpdateForm {
  projectId: string;
  jwtToken: string;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ProjectInfoUpdateForm({ projectId, jwtToken, setShowForm }: ProjectInfoUpdateForm) {
  const { data: project } = useProjectQuery(projectId);
  const updateMutation = useUpdateProjectInfoMutation(projectId, jwtToken);

  const form = useForm<z.infer<typeof updateProjectSchema>>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
    },
  });

  const { control, handleSubmit, formState, reset } = form;
  const { isSubmitting } = formState;

  const onSubmit = async (values: z.infer<typeof updateProjectSchema>) => {
    try {
      await updateMutation.mutateAsync(values);
      toast.success('Project info updated successfully');
      setShowForm(false);
    } catch (error: any) {
      const messageFromResponse = error?.message || 'Failed to update project info';
      toast.error(messageFromResponse);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mx-auto">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Project Name <RequiredFieldMark />
              </FormLabel>
              <FormControl>
                <Input placeholder="Project name" autoComplete="off" disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Project description" autoComplete="off" disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
          <Button
            type="button"
            className="flex-1 "
            onClick={() => {
              setShowForm(false);
              reset();
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
