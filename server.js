const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors({
   origin: 'http://localhost:3000',
}));
const env = require('dotenv').config;
const supabase = require('./db.js')
const PORT = 5000;

app.post('/workout-plan', async(req, res) => {
      const planName = req.body.planName;
      const exercises = req.body.exercises;

      //Validate request body
      if (!planName || !Array.isArray(exercises) || exercises.length === 0) {
         res.status(400).json({error: 'Invalid request payload'});
         return;
      }
 
      try{
         // Insert into workoutplan
         const { data: planData, error: planError } = await supabase
      .from('workoutplan')
      .insert([{
        planname: planName
      }]).select().single();

      if (planError) {
         console.error('Plan insertion error:', planError);
         res.status(500).json({error: 'Failed to create workout plan' })
         return;
      }

      console.log('Inserted plan data:', planData);
      const planID = planData.planid //Get the planid of the inserted workout plan

      for (let exercise of exercises) {
         //Insert into exercises
        const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercise')
        .insert([{exercisename: exercise.name, duration: exercise.duration}])
        .select()
        .single();

        if (exerciseError) {
           console.error('Exercise insertion error:', exerciseError);
           res.status(500).json({
            error: 'Failed to insert exercise'
           });
           return;
        }

        // Get the exerciseid of the inserted exercise
        const exerciseID = exerciseData.exerciseid; 


         // Insert into workoutplanexercises
         const { data: wpeData, error: wpeError } = await supabase
         .from('workoutplanexercises')
            .insert([{ planid: planID, exerciseid: exerciseID
            }]);
        

        if (wpeError) {
           console.error('Workout plan exercises insertion error', wpeError);
           res.status(500).json({
            error: 'Failed to link exercise to workout plan'
           });
           return;
        }
      }

      res.json({message: 'Workout plan created successfully'});
      } catch (error) {
         console.error('Unexpected error:', error);
         res.status(500).json({error: 'Unexpected server error'})
      }

});

app.get('/workout-plan/:planname', async(req, res) => {
   const planName = req.params.planname;

   try {
      //Retrieve workout plan by name
      const { data: planData, error: planError } = await supabase
        .from('workoutplan')
        .select('planid')
        .eq('planname', planName)
        .single();


      if (planError) {
         console.error('Plan retrieval error', planError);
         return res.status(500).json({error: 'Failed to retrieve workout plan '});
      }

      if (!planData) {
        return res.status(404).json({ error: 'Workout plan not found' });
      }

      //Retrieve the exercises associated with the workout plan
      const { data: exercisesData, error: exercisesError } = await supabase
          .from('workoutplanexercises')
          .select('exerciseid(exercisename, duration)')
          .eq('planid', planData.planid);

      if (exercisesError) {
         console.error('Exercises retrieval error:', exercisesError);
         res.status(500).json({error: 'Failed to retrieve exercises for workout plan' });
         return;
      }

      //Construct response payload
      const response = {
         planName: planName,
         exercises: exercisesData.map(e => ({
            name: e.exerciseid.exercisename,
            duration: e.exerciseid.duration
         }))
      };

      res.json(response);
   } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Unexpected server error' });
   }
});

app.put('/workout-plan/:planname', async (req, res) => {
    const oldPlanName = req.params.planname;
    const { newPlanName, exercises } = req.body;

    try {
       //Fetch the workout plan ID based on the old plan name
       const { data: planData, error: planError } = await supabase
           .from('workoutplan')
           .select('planid')
           .eq('planname', oldPlanName)
           .single();

       if (planError) {
          console.error('Plan retrieval error', planError);
          return res.status(500).json({ error: 'Failed to retrieve workout plan' });
       }

       if (!planData) {
          return res.status(404).json({ error: 'Workout plan not found '});
       }

       const planID = planData.planid;

       //Update plan name is new one is provided
       if (newPlanName) {
          const { error: updatePlanError } = await supabase
              .from('workoutplan')
              .update({planname: newPlanName })
              .eq('planid', planID);

         if (updatePlanError) {
            console.error('Plan name update error', updatePlanError);
            return res.status(500).json({ error: 'Failed to update workout plan name'});

         }
       }

       //Ensure exercises is an array and contains valid objects
       if (!Array.isArray(exercises)) {
         return res.status(400).json({ error: 'Invalid exercises format' });
       }

       const updates = exercises.map( async (exercise) => {

         if (!exercise || typeof exercise !== 'object' || !exercise.exerciseid) {
            console.error('Invalid exercise data', exercise);
            throw new Error('Invalid exercise data');
         }

         const  { error } = await supabase
             .from('exercise')
             .update({
                 exercisename: exercise.name,
                 duration: exercise.duration
             })
             .eq('exerciseid', exercise.exerciseid);

             if (error) {
               console.error(`Error updating exercise ID ${exercise.exerciseid}`, error);
               throw new Error(`Failed to update exercise ID ${exercise.exerciseid}`);
             }
       });

       await Promise.all(updates);

       res.json({ message: 'Workout plan updated successfully' })
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({error: 'Unexpected server error' })
    }
});

app.patch('/workout-plan', async (req, res) => {

})

app.post('/workout-history', async (req, res) => {
   const { completedPlanName, workoutDate } = req.body;

   if (!completedPlanName || !workoutDate) {
      res.status(400).json({ error: 'Invalid request payload'});
      return;
   }

   try {
      
      const {data, error} = await supabase
      .from('workouthistory')
      .insert([{completedplanname: completedPlanName, workoutdate: workoutDate}])
      .single();

      if (error) {
         console.error('Workout history insertion error', error);
         res.status(500).json({ error: 'Failed to record workout history'});
         return;
      }

      res.json({ message: 'Workout history recorded successfully' });




   } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({error: 'Unexpected server error'})
   }

});
































































app.listen(5000, () => console.log(`Server has started on port: ${PORT}`));

module.exports = app;